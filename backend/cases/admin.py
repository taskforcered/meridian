from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Case, Profile, SourceDocument, TimelineEvent


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')


@admin.register(Case)
class CaseAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'claimant_name', 'firm', 'status', 'created_at', 'updated_at')
    list_filter = ('status',)
    search_fields = ('claimant_name', 'firm')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'filename', 'case', 'extraction_status', 'uploaded_at')
    list_filter = ('extraction_status',)
    search_fields = ('filename', 'case__claimant_name')
    readonly_fields = ('uploaded_at',)


@admin.register(TimelineEvent)
class TimelineEventAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'event_date', 'provider_name', 'case', 'flags')
    list_filter = ('event_date',)
    search_fields = ('provider_name', 'description', 'case__claimant_name')
