from django.contrib.auth.models import User
from django.db import models
from simple_history.models import HistoricalRecords


class Organization(models.Model):
    """A tenant — one customer firm/insurer. The isolation boundary for all case data."""

    name = models.CharField(max_length=255)
    # Subdomain label (acme.meridianapp.com) used by TenantMiddleware to resolve
    # the tenant for every request — see cases/middleware.py.
    slug = models.SlugField(max_length=63, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    """One row per (user, organization) membership — a person can belong to
    more than one tenant (e.g. a consulting attorney who works two firms'
    cases), each with their own role. Platform admins (is_superuser) have
    zero Profile rows: they aren't a member of any tenant, that's the whole
    point of "God Mode" — see IsPlatformAdmin.
    """

    ROLE_PARALEGAL = 'paralegal'
    ROLE_ATTORNEY = 'attorney'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_PARALEGAL, 'Paralegal'),
        (ROLE_ATTORNEY, 'Attorney'),
        (ROLE_ADMIN, 'Admin'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='profiles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PARALEGAL)
    # Per-membership, not per-user: deactivating someone from one org must not
    # lock them out of another org they also belong to.
    is_active = models.BooleanField(default=True)
    # Which membership this user lands in after login when they belong to
    # more than one and haven't picked one for the session yet (see
    # cases/auth_views.py). At most one True per user — enforced in code,
    # not the DB, since partial unique constraints vary by DB backend.
    is_default = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'organization'], name='unique_user_organization'),
        ]

    def __str__(self):
        return f'{self.user.username} ({self.role} @ {self.organization.name})'


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

    # The tenant boundary. PROTECT (not CASCADE): deleting an org's row must
    # never silently take its clients' case data with it.
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name='cases')
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
