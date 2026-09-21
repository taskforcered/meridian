"""
OCR extraction service.

Production path  : AWS Textract via boto3 (TextractOCRService).
Local / CI path  : MockOCRService — deterministic canned output, no AWS credentials needed.

Which one is used is controlled by the USE_REAL_OCR Django setting (default False).
Call get_ocr_service() to obtain the correct implementation at runtime.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)


@dataclass
class PageResult:
    page_number: int
    text: str


@dataclass
class OCRResult:
    pages: list[PageResult] = field(default_factory=list)


@runtime_checkable
class OCRService(Protocol):
    def extract(self, storage_ref: str) -> OCRResult:
        ...


class MockOCRService:
    """
    Returns deterministic canned page text.
    Safe to run locally with no AWS credentials — useful for development and tests.
    """

    def extract(self, storage_ref: str) -> OCRResult:
        return OCRResult(pages=[
            PageResult(
                page_number=1,
                text=(
                    'EMERGENCY DEPARTMENT REPORT\n'
                    'Patient: Jane Doe  DOB: 1985-03-12\n'
                    'Date of Service: 2024-01-15\n'
                    'Attending Physician: Dr. A. Rivera, MD\n\n'
                    'Chief Complaint: Acute lower back pain following MVA on 2024-01-14.\n'
                    'Assessment: Lumbar strain, causally related to the motor vehicle accident.\n'
                    'Plan: NSAID therapy, physical therapy referral, follow-up in two weeks.'
                ),
            ),
            PageResult(
                page_number=2,
                text=(
                    'ORTHOPEDIC FOLLOW-UP NOTE\n'
                    'Date of Service: 2024-02-10\n'
                    'Provider: Dr. K. Patel, MD — Orthopedic Surgery\n\n'
                    'Patient reports ongoing lower back pain with limited ROM. MRI lumbar spine ordered.\n'
                    'No prior history of back injury documented in chart.'
                ),
            ),
        ])


class LocalOCRService:
    """
    Real OCR with no cloud account: pdfplumber pulls the embedded text layer
    per page, falling back to Tesseract (via pdf2image rasterizing that page)
    only for pages with no text layer, e.g. scanned/faxed records. Non-PDF
    uploads (used in early testing) are read as plain text.
    """

    IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'}
    TEXT_SUFFIXES = {'.txt'}

    def extract(self, storage_ref: str) -> OCRResult:
        from django.conf import settings

        path = Path(settings.MEDIA_ROOT) / storage_ref
        if not path.exists():
            raise FileNotFoundError(f'No such document on disk: {path}')

        suffix = path.suffix.lower()

        if suffix in self.IMAGE_SUFFIXES:
            import pytesseract
            from PIL import Image

            return OCRResult(pages=[
                PageResult(page_number=1, text=pytesseract.image_to_string(Image.open(path))),
            ])

        if suffix in self.TEXT_SUFFIXES:
            return OCRResult(pages=[
                PageResult(page_number=1, text=path.read_text(errors='ignore')),
            ])

        if suffix != '.pdf':
            # Unknown format — best effort as plain text rather than failing the upload outright.
            return OCRResult(pages=[
                PageResult(page_number=1, text=path.read_text(errors='ignore')),
            ])

        import pdfplumber

        pages: list[PageResult] = []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = (page.extract_text() or '').strip()
                if not text:
                    text = self._ocr_page(path, i)
                pages.append(PageResult(page_number=i, text=text))
        return OCRResult(pages=pages)

    def _ocr_page(self, path: Path, page_number: int) -> str:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(str(path), first_page=page_number, last_page=page_number)
        if not images:
            return ''
        return pytesseract.image_to_string(images[0])


class TextractOCRService:
    """
    Production OCR using AWS Textract.

    Requirements when enabled (USE_REAL_OCR=True):
      - AWS credentials available via environment or IAM role
      - AWS_S3_BUCKET Django setting: S3 bucket that contains the uploaded file
      - AWS_REGION_NAME Django setting (default 'us-east-1')
      - storage_ref must be a valid S3 object key within AWS_S3_BUCKET

    Raises NotImplementedError until fully wired; keep USE_REAL_OCR=False for local dev.
    """

    def __init__(self, s3_bucket: str, region: str = 'us-east-1') -> None:
        self.s3_bucket = s3_bucket
        self.region = region

    def extract(self, storage_ref: str) -> OCRResult:
        # Real implementation sketch (uncomment when wiring for production):
        #
        # import boto3
        # client = boto3.client('textract', region_name=self.region)
        # response = client.detect_document_text(
        #     Document={'S3Object': {'Bucket': self.s3_bucket, 'Name': storage_ref}}
        # )
        # blocks_by_page: dict[int, list[str]] = {}
        # for block in response.get('Blocks', []):
        #     if block['BlockType'] == 'LINE':
        #         page = block.get('Page', 1)
        #         blocks_by_page.setdefault(page, []).append(block['Text'])
        # pages = [
        #     PageResult(page_number=pnum, text='\n'.join(lines))
        #     for pnum, lines in sorted(blocks_by_page.items())
        # ]
        # return OCRResult(pages=pages)

        raise NotImplementedError(
            'TextractOCRService is not yet wired. Set USE_REAL_OCR=False to use MockOCRService.'
        )


def get_ocr_service() -> OCRService:
    from django.conf import settings
    from cases.feature_flags import is_enabled
    if is_enabled('USE_REAL_OCR'):
        return TextractOCRService(
            s3_bucket=settings.AWS_S3_BUCKET,
            region=getattr(settings, 'AWS_REGION_NAME', 'us-east-1'),
        )
    if is_enabled('USE_LOCAL_OCR'):
        return LocalOCRService()
    return MockOCRService()
