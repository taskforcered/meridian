"""
OCR extraction service.

Production path  : AWS Textract via boto3 (TextractOCRService).
Local / CI path  : MockOCRService — deterministic canned output, no AWS credentials needed.

Which one is used is controlled by the USE_REAL_OCR Django setting (default False).
Call get_ocr_service() to obtain the correct implementation at runtime.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


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
    if getattr(settings, 'USE_REAL_OCR', False):
        return TextractOCRService(
            s3_bucket=settings.AWS_S3_BUCKET,
            region=getattr(settings, 'AWS_REGION_NAME', 'us-east-1'),
        )
    return MockOCRService()
