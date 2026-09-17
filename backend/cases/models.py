from django.contrib.auth.models import User
from django.db import models
from simple_history.models import HistoricalRecords


class Profile(models.Model):
    ROLE_PARALEGAL = 'paralegal'
    ROLE_ATTORNEY = 'attorney'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_PARALEGAL, 'Paralegal'),
        (ROLE_ATTORNEY, 'Attorney'),
        (ROLE_ADMIN, 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PARALEGAL)

    def __str__(self):
        return f'{self.user.username} ({self.role})'


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
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_cases'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
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
    # storage_ref is kept as the OCR-service-facing pointer; auto-set from file.name on save
    file = models.FileField(upload_to='documents/%Y/%m/', blank=True)
    storage_ref = models.CharField(max_length=1024, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    extraction_status = models.CharField(
        max_length=20,
        choices=EXTRACTION_STATUS_CHOICES,
        default=EXTRACTION_PENDING,
    )

    class Meta:
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # file.name is the full relative path only after super().save() runs FileField.pre_save
        if self.file and not self.storage_ref:
            type(self).objects.filter(pk=self.pk).update(storage_ref=self.file.name)
            self.storage_ref = self.file.name

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
    # M2M, not FK: the same event can legitimately turn up in more than one
    # record (e.g. an ER note and a later specialist follow-up both mention it).
    source_documents = models.ManyToManyField(
        SourceDocument,
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
    verified = models.BooleanField(default=False)
    reviewer_note = models.TextField(blank=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ['event_date']

    def __str__(self):
        return f'{self.event_date} — {self.provider_name or "Unknown provider"}'

    def get_flag_items(self) -> list[dict]:
        """Returns [{'key': 'causation_relevant', 'label': 'Causation Relevant'}, ...]."""
        return [{'key': f, 'label': FLAG_LABELS.get(f, f)} for f in self.flags]
