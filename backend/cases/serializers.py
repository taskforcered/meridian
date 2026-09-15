from rest_framework import serializers
from .models import Case, SourceDocument, TimelineEvent


class SourceDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceDocument
        fields = '__all__'
        read_only_fields = ('uploaded_at',)


class TimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEvent
        fields = '__all__'


class CaseSerializer(serializers.ModelSerializer):
    documents = SourceDocumentSerializer(many=True, read_only=True)
    events = TimelineEventSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CaseListSerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(source='documents.count', read_only=True)
    event_count = serializers.IntegerField(source='events.count', read_only=True)

    class Meta:
        model = Case
        fields = (
            'id', 'claimant_name', 'firm', 'status',
            'created_at', 'updated_at', 'document_count', 'event_count',
        )
