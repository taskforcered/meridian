import functools
import operator
import os
import zipfile

from django.core.files.base import ContentFile
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Case, Organization, Profile, SourceDocument, TimelineEvent
from .permissions import IsAttorneyOrAdmin, IsOrgAdmin, IsPlatformAdmin, IsTenantMember
from .serializers import (
    CaseListSerializer,
    CaseSerializer,
    MemberSerializer,
    OrganizationSerializer,
    SourceDocumentSerializer,
    TimelineEventSerializer,
)
from .tasks import extract_document

# Guards against zip-bomb-style uploads — generous for real record sets, not unbounded.
ZIP_MAX_FILES = 500
ZIP_MAX_TOTAL_BYTES = 500 * 1024 * 1024


class TenantScopedMixin:
    """Scopes every queryset to request.tenant. IsTenantMember (or IsOrgAdmin,
    which implies it) has already verified the caller is entitled to that
    tenant by the time get_queryset runs — see cases/permissions.py.
    """

    permission_classes = [IsTenantMember]
    tenant_lookup = 'organization'

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**{self.tenant_lookup: self.request.tenant})


class CaseViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Case.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        return CaseSerializer

    def perform_create(self, serializer):
        # organization is read-only on the serializer specifically so it can't
        # be spoofed via the request body — it always comes from the tenant
        # the request resolved to, never client input.
        serializer.save(organization=self.request.tenant)

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        from .pdf import render_case_pdf
        case = self.get_object()
        pdf_bytes = render_case_pdf(case)
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="case_{case.pk}_timeline.pdf"'
        return resp

    @action(detail=True, methods=['post'], permission_classes=[IsTenantMember, IsAttorneyOrAdmin])
    def sign_off(self, request, pk=None):
        case = self.get_object()
        if case.events.filter(verified=False).exists():
            return Response(
                {'detail': 'All timeline events must be verified before sign-off.'},
                status=400,
            )
        case.status = Case.STATUS_COMPLETE
        case.reviewed_by = request.user
        case.reviewed_at = timezone.now()
        case.save()
        return Response(CaseSerializer(case, context={'request': request}).data)


class SourceDocumentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = SourceDocument.objects.all()
    serializer_class = SourceDocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    tenant_lookup = 'case__organization'

    def get_queryset(self):
        qs = super().get_queryset()
        case_id = self.request.query_params.get('case')
        if case_id:
            qs = qs.filter(case_id=case_id)
        return qs

    def _case_in_tenant(self, case):
        if case is None or case.organization_id != self.request.tenant.id:
            raise PermissionDenied('Case does not belong to this organization.')

    def perform_create(self, serializer):
        self._case_in_tenant(serializer.validated_data.get('case'))
        doc = serializer.save()
        extract_document.delay(doc.pk)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        case = get_object_or_404(Case, pk=request.data.get('case'), organization=request.tenant)
        uploads = request.FILES.getlist('files')
        if not uploads:
            return Response({'detail': 'No files provided.'}, status=400)

        created = []
        errors = []
        for f in uploads:
            if f.name.lower().endswith('.zip'):
                try:
                    created.extend(self._extract_zip(f, case))
                except ValueError as exc:
                    errors.append({'filename': f.name, 'detail': str(exc)})
            else:
                doc = SourceDocument.objects.create(case=case, filename=f.name, file=f)
                extract_document.delay(doc.pk)
                created.append(doc)

        serializer = SourceDocumentSerializer(created, many=True, context={'request': request})
        return Response({'created': serializer.data, 'errors': errors}, status=201)

    def _extract_zip(self, uploaded_file, case):
        created = []
        with zipfile.ZipFile(uploaded_file) as zf:
            infos = [i for i in zf.infolist() if not i.is_dir()]
            if len(infos) > ZIP_MAX_FILES:
                raise ValueError(f'Zip contains more than {ZIP_MAX_FILES} files.')
            if sum(i.file_size for i in infos) > ZIP_MAX_TOTAL_BYTES:
                raise ValueError('Zip contents exceed the size limit.')

            for info in infos:
                # normpath collapses "a/../../etc/passwd"-style traversal so the
                # startswith('..') check below actually catches zip-slip entries.
                safe_path = os.path.normpath(info.filename)
                base = os.path.basename(safe_path)
                if (
                    not base
                    or base.startswith('.')
                    or '__MACOSX' in info.filename
                    or safe_path.startswith('..')
                    or os.path.isabs(safe_path)
                ):
                    continue
                doc = SourceDocument.objects.create(
                    case=case,
                    filename=base,
                    file=ContentFile(zf.read(info), name=base),
                )
                extract_document.delay(doc.pk)
                created.append(doc)
        return created


class TimelineEventViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = TimelineEvent.objects.all()
    serializer_class = TimelineEventSerializer
    tenant_lookup = 'case__organization'

    def get_queryset(self):
        qs = super().get_queryset()

        case_id = self.request.query_params.get('case')
        if case_id:
            qs = qs.filter(case_id=case_id)

        # ?flag=causation_relevant&flag=record_conflict -> OR across requested flags
        flags = self.request.query_params.getlist('flag')
        if flags:
            q = functools.reduce(
                operator.or_,
                [Q(flags__contains=[f]) for f in flags],
            )
            qs = qs.filter(q)

        return qs

    def perform_create(self, serializer):
        case = serializer.validated_data.get('case')
        if case is None or case.organization_id != self.request.tenant.id:
            raise PermissionDenied('Case does not belong to this organization.')
        for doc in serializer.validated_data.get('source_documents') or []:
            if doc.case_id != case.id:
                raise ValidationError('source_documents must belong to the same case.')
        serializer.save()


class OrganizationViewSet(viewsets.ModelViewSet):
    """Platform-admin-only registry of tenants. Deliberately not tenant-scoped
    — this *is* the list of tenants, so a resolved request.tenant is neither
    required nor meaningful here."""

    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsPlatformAdmin]


class MembershipViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Manage a tenant's users. Org Admins manage their own org; platform
    admins manage whichever org they've entered via X-Tenant-Slug."""

    queryset = Profile.objects.select_related('user').all()
    serializer_class = MemberSerializer
    # No DELETE: removing access is "deactivate" (below), which leaves the
    # underlying User/Profile intact for audit history instead of orphaning it.
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsTenantMember()]
        return [IsOrgAdmin()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['organization'] = self.request.tenant
        return ctx

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        # Deactivates this org's membership only — the user's account and any
        # other org's membership are untouched (see Profile.is_active).
        profile = self.get_object()
        if profile.user_id == request.user.id:
            return Response({'detail': "Can't deactivate your own membership."}, status=400)
        profile.is_active = False
        profile.save(update_fields=['is_active'])
        return Response(MemberSerializer(profile).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        profile = self.get_object()
        profile.is_active = True
        profile.save(update_fields=['is_active'])
        return Response(MemberSerializer(profile).data)
