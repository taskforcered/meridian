from django.db import models
from simple_history.models import HistoricalRecords


class Case(models.Model):
    STATUS_INTAKE = 'intake'
    STATUS_PROCESSING = 'processing'
    STATUS_REVIEW = 'review'
    STATUS_COMPLETE = 'complete'
    STATUS_CHOICES = [
        (STATUS_INTAKE, 'Intake'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_REVIEW, 'Under Review'),
        (STATUS_COMPLETE, 'Complete'),
    ]

    claimant_name = models.CharField(max_length=255)
    firm = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INTAKE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Case #{self.pk}: {self.claimant_name}'


class SourceDocument(models.Model):
    EXTRACTION_PENDING = 'pending'
    EXTRACTION_PROCESSING = 'processing'
    EXTRACTION_COMPLETE = 'complete'
    EXTRACTION_FAILED = 'failed'
    EXTRACTION_STATUS_CHOICES = [
        (EXTRACTION_PENDING, 'Pending'),
        (EXTRACTION_PROCESSING, 'Processing'),
        (EXTRACTION_COMPLETE, 'Complete'),
        (EXTRACTION_FAILED, 'Failed'),
    ]

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='documents')
    filename = models.CharField(max_length=255)
    storage_ref = models.CharField(max_length=1024, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    extraction_status = models.CharField(
        max_length=20,
        choices=EXTRACTION_STATUS_CHOICES,
        default=EXTRACTION_PENDING,
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.filename} ({self.case})'


FLAG_CAUSATION = 'causation_relevant'
FLAG_PRE_EXISTING = 'pre_existing_condition'
FLAG_CONFLICT = 'record_conflict'
FLAG_TREATMENT_GAP = 'treatment_gap'

FLAG_LABELS = {
    FLAG_CAUSATION: 'Causation Relevant',
    FLAG_PRE_EXISTING: 'Pre-existing Condition',
    FLAG_CONFLICT: 'Record Conflict',
    FLAG_TREATMENT_GAP: 'Treatment Gap',
}


class TimelineEvent(models.Model):
    FLAG_CHOICES = list(FLAG_LABELS.items())

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='events')
    source_document = models.ForeignKey(
        SourceDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    event_date = models.DateField()
    provider_name = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    source_page = models.PositiveIntegerField(null=True, blank=True)
    citation_text = models.TextField(blank=True)
    # Stored as a JSON array of flag-type strings, e.g. ["causation_relevant", "record_conflict"]
    flags = models.JSONField(default=list, blank=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ['event_date']

    def __str__(self):
        return f'{self.event_date} — {self.provider_name or "Unknown provider"}'

    def get_flag_items(self) -> list[dict]:
        """Returns [{'key': 'causation_relevant', 'label': 'Causation Relevant'}, ...]."""
        return [{'key': f, 'label': FLAG_LABELS.get(f, f)} for f in self.flags]
