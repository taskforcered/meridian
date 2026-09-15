"""
LLM extraction service — Anthropic Claude via AWS Bedrock.

Production path  : BedrockClaudeService, which calls boto3's bedrock-runtime client.
Local / CI path  : MockLLMService — returns canned structured timeline events, no credentials needed.

Which one is used is controlled by the USE_REAL_LLM Django setting (default False).
Call get_llm_service() to obtain the correct implementation at runtime.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from services.ocr import PageResult


@dataclass
class ExtractedEvent:
    event_date: str          # ISO-8601 date string, e.g. "2024-01-15"
    provider_name: str
    description: str
    source_page: int | None
    citation_text: str
    flags: list[str]         # subset of FLAG_CHOICES keys from cases.models


@dataclass
class LLMExtractionResult:
    events: list[dict[str, Any]] = field(default_factory=list)


@runtime_checkable
class LLMService(Protocol):
    def extract_timeline_events(self, pages: list[PageResult]) -> LLMExtractionResult:
        ...


class MockLLMService:
    """
    Returns deterministic canned timeline events derived from the mock OCR output.
    Safe to run locally with no AWS or Anthropic credentials.
    """

    def extract_timeline_events(self, pages: list[PageResult]) -> LLMExtractionResult:
        return LLMExtractionResult(events=[
            {
                'event_date': '2024-01-14',
                'provider_name': '',
                'description': 'Motor vehicle accident — reported date of injury.',
                'source_page': None,
                'citation_text': '',
                'flags': ['causation_relevant'],
            },
            {
                'event_date': '2024-01-15',
                'provider_name': 'Dr. A. Rivera, MD',
                'description': (
                    'Emergency department presentation for acute lower back pain '
                    'following MVA. Diagnosis: lumbar strain causally related to '
                    'the motor vehicle accident. NSAID therapy and PT referral initiated.'
                ),
                'source_page': 1,
                'citation_text': (
                    'Chief Complaint: Acute lower back pain following MVA on 2024-01-14. '
                    'Assessment: Lumbar strain, causally related to the motor vehicle accident.'
                ),
                'flags': ['causation_relevant'],
            },
            {
                'event_date': '2024-02-10',
                'provider_name': 'Dr. K. Patel, MD — Orthopedic Surgery',
                'description': (
                    'Orthopedic follow-up. Ongoing lower back pain, limited ROM. '
                    'MRI lumbar spine ordered. No documented prior history of back injury.'
                ),
                'source_page': 2,
                'citation_text': (
                    'Patient reports ongoing lower back pain. MRI ordered. '
                    'No prior history of back injury documented in chart.'
                ),
                'flags': ['causation_relevant'],
            },
        ])


class BedrockClaudeService:
    """
    Production LLM extraction using Anthropic Claude via AWS Bedrock.

    Requirements when enabled (USE_REAL_LLM=True):
      - AWS credentials with bedrock:InvokeModel permission
      - BEDROCK_MODEL_ID Django setting (e.g. 'anthropic.claude-3-sonnet-20240229-v1:0')
      - AWS_REGION_NAME Django setting (default 'us-east-1')

    The model is prompted to return a JSON array of timeline events matching the
    ExtractedEvent schema above.

    Raises NotImplementedError until fully wired; keep USE_REAL_LLM=False for local dev.
    """

    SYSTEM_PROMPT = (
        'You are a medical record analyst supporting personal-injury litigation. '
        'Given OCR-extracted text from medical records, produce a structured JSON array of '
        'chronological medical events. Each element must include: '
        'event_date (YYYY-MM-DD), provider_name (string), description (string), '
        'source_page (integer or null), citation_text (verbatim passage from the record), '
        'flags (array, each element one of: causation_relevant, pre_existing_condition, '
        'record_conflict, treatment_gap). '
        'Return only valid JSON — no prose, no markdown fences.'
    )

    def __init__(self, model_id: str, region: str = 'us-east-1') -> None:
        self.model_id = model_id
        self.region = region

    def extract_timeline_events(self, pages: list[PageResult]) -> LLMExtractionResult:
        # Real implementation sketch (uncomment when wiring for production):
        #
        # import json
        # import boto3
        # client = boto3.client('bedrock-runtime', region_name=self.region)
        # combined = '\n\n'.join(f'[Page {p.page_number}]\n{p.text}' for p in pages)
        # body = json.dumps({
        #     'anthropic_version': 'bedrock-2023-05-31',
        #     'max_tokens': 4096,
        #     'system': self.SYSTEM_PROMPT,
        #     'messages': [{'role': 'user', 'content': combined}],
        # })
        # response = client.invoke_model(modelId=self.model_id, body=body)
        # payload = json.loads(response['body'].read())
        # events = json.loads(payload['content'][0]['text'])
        # return LLMExtractionResult(events=events)

        raise NotImplementedError(
            'BedrockClaudeService is not yet wired. Set USE_REAL_LLM=False to use MockLLMService.'
        )


def get_llm_service() -> LLMService:
    from django.conf import settings
    if getattr(settings, 'USE_REAL_LLM', False):
        return BedrockClaudeService(
            model_id=settings.BEDROCK_MODEL_ID,
            region=getattr(settings, 'AWS_REGION_NAME', 'us-east-1'),
        )
    return MockLLMService()
