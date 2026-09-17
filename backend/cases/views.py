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
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Case, SourceDocument, TimelineEvent
from .permissions import IsAttorneyOrAdmin
from .serializers import (
    CaseListSerializer,
    CaseSerializer,
    SourceDocumentSerializer,
    TimelineEventSerializer,
)
from .tasks import extract_document

# Guards against zip-bomb-style uploads — generous for real record sets, not unbounded.
ZIP_MAX_FILES = 500
ZIP_MAX_TOTAL_BYTES = 500 * 1024 * 1024


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        return CaseSerializer

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        from .pdf import render_case_pdf
        case = self.get_object()
        pdf_bytes = render_case_pdf(case)
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="case_{case.pk}_timeline.pdf"'
        return resp

    @action(detail=True, methods=['post'], permission_classes=[IsAttorneyOrAdmin])
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


class SourceDocumentViewSet(viewsets.ModelViewSet):
    queryset = SourceDocument.objects.all()
    serializer_class = SourceDocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        case_id = self.request.query_params.get('case')
        if case_id:
            qs = qs.filter(case_id=case_id)
        return qs

    def perform_create(self, serializer):
        doc = serializer.save()
        extract_document.delay(doc.pk)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        case = get_object_or_404(Case, pk=request.data.get('case'))
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


class TimelineEventViewSet(viewsets.ModelViewSet):
    queryset = TimelineEvent.objects.all()
    serializer_class = TimelineEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        case_id = self.request.query_params.get('case')
        if case_id:
            qs = qs.filter(case_id=case_id)

        # ?flag=causation_relevant&flag=record_conflict → OR across requested flags
        flags = self.request.query_params.getlist('flag')
        if flags:
            q = functools.reduce(
                operator.or_,
                [Q(flags__contains=[f]) for f in flags],
            )
            qs = qs.filter(q)

        return qs
