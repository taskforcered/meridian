from rest_framework import serializers
from .models import Case, SourceDocument, TimelineEvent


class SourceDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceDocument
        fields = '__all__'
        read_only_fields = ('uploaded_at',)


class SourceDocumentRefSerializer(serializers.ModelSerializer):
    """Lightweight nested view for citing a document from a timeline event."""

    class Meta:
        model = SourceDocument
        fields = ('id', 'filename', 'file')


class TimelineEventSerializer(serializers.ModelSerializer):
    # source_documents (writable, PK list) stays available via '__all__';
    # this adds the filename/link detail the UI renders per citation.
    source_documents_detail = SourceDocumentRefSerializer(
        source='source_documents', many=True, read_only=True,
    )

    class Meta:
        model = TimelineEvent
        fields = '__all__'


class CaseSerializer(serializers.ModelSerializer):
    documents = SourceDocumentSerializer(many=True, read_only=True)
    events = TimelineEventSerializer(many=True, read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Case
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CaseListSerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(source='documents.count', read_only=True)
    event_count = serializers.IntegerField(source='events.count', read_only=True)
    verified_event_count = serializers.SerializerMethodField()
    reviewed_by = serializers.StringRelatedField(read_only=True)

    def get_verified_event_count(self, obj):
        return obj.events.filter(verified=True).count()

    class Meta:
        model = Case
        fields = (
            'id', 'claimant_name', 'firm', 'status',
            'created_at', 'updated_at', 'document_count', 'event_count',
            'verified_event_count', 'reviewed_by', 'reviewed_at',
        )
