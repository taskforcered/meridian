from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Case, Organization, PlatformSettings, Profile, SourceDocument, TimelineEvent


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'is_active', 'is_default')
    list_filter = ('organization', 'role', 'is_active')
    search_fields = ('user__username', 'user__email', 'organization__name')


@admin.register(Case)
class CaseAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'claimant_name', 'organization', 'firm', 'status', 'created_at', 'updated_at')
    list_filter = ('organization', 'status')
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


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'default_new_org_active', 'default_new_member_role', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
