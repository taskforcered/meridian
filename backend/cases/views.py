import functools
import operator

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action

from .models import Case, SourceDocument, TimelineEvent
from .serializers import (
    CaseListSerializer,
    CaseSerializer,
    SourceDocumentSerializer,
    TimelineEventSerializer,
)
from .tasks import extract_document


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


class SourceDocumentViewSet(viewsets.ModelViewSet):
    queryset = SourceDocument.objects.all()
    serializer_class = SourceDocumentSerializer

    def perform_create(self, serializer):
        doc = serializer.save()
        extract_document.delay(doc.pk)


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
