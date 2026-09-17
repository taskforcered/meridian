import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def extract_document(self, source_document_id: int) -> dict:
    """
    OCR + LLM extraction pipeline for a single SourceDocument.

    Steps:
    1. Mark the document as processing.
    2. Run OCR (AWS Textract or mock) to extract page text.
    3. Run LLM extraction (Anthropic Claude via Bedrock or mock) to produce
       structured timeline events.
    4. Persist TimelineEvents to the database.
    5. Mark document as complete (or failed on error, with retry).
    """
    # Deferred imports keep the module importable before Django's app registry is ready.
    from cases.models import SourceDocument, TimelineEvent
    from services.ocr import get_ocr_service
    from services.llm import get_llm_service

    try:
        doc = SourceDocument.objects.get(pk=source_document_id)
    except SourceDocument.DoesNotExist:
        logger.error('SourceDocument %s not found; skipping extraction.', source_document_id)
        return {'status': 'not_found', 'source_document_id': source_document_id}

    doc.extraction_status = SourceDocument.EXTRACTION_PROCESSING
    doc.save(update_fields=['extraction_status'])

    try:
        ocr_result = get_ocr_service().extract(doc.storage_ref)
        llm_result = get_llm_service().extract_timeline_events(ocr_result.pages)

        created_ids = []
        for event_data in llm_result.events:
            event = TimelineEvent.objects.create(
                case=doc.case,
                event_date=event_data['event_date'],
                provider_name=event_data.get('provider_name', ''),
                description=event_data.get('description', ''),
                source_page=event_data.get('source_page'),
                citation_text=event_data.get('citation_text', ''),
                flags=event_data.get('flags', []),
            )
            event.source_documents.add(doc)
            created_ids.append(event.pk)

        doc.extraction_status = SourceDocument.EXTRACTION_COMPLETE
        doc.save(update_fields=['extraction_status'])

        logger.info(
            'Extracted %d events from document %s (case %s).',
            len(created_ids), source_document_id, doc.case_id,
        )
        return {'status': 'complete', 'events_created': len(created_ids), 'event_ids': created_ids}

    except Exception as exc:
        doc.extraction_status = SourceDocument.EXTRACTION_FAILED
        doc.save(update_fields=['extraction_status'])
        logger.exception('Extraction failed for document %s.', source_document_id)
        raise self.retry(exc=exc, countdown=60)
