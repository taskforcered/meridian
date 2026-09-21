from django.contrib.auth.models import User
from rest_framework import serializers
from .middleware import RESERVED_SLUGS
from .models import Case, Organization, PlatformSettings, Profile, SourceDocument, TimelineEvent


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('id', 'name', 'slug', 'is_active', 'created_at')
        read_only_fields = ('created_at',)

    def validate_slug(self, value):
        slug = value.strip().lower()
        if not slug.replace('-', '').isalnum():
            raise serializers.ValidationError('Slug must be alphanumeric (hyphens allowed).')
        if slug in RESERVED_SLUGS:
            raise serializers.ValidationError(f'"{slug}" is reserved.')
        return slug


class MemberSerializer(serializers.ModelSerializer):
    """Manages a Profile — a (user, organization) membership. 'organization'
    is never client-supplied — MembershipViewSet injects it from
    request.tenant via serializer context, same pattern as Case.organization.

    Email doubles as the login identity (stored in User.username, which is
    already globally unique) and is NOT unique across Profiles — the same
    person can be invited into more than one organization, which just adds
    a second Profile row for their existing User account.
    """

    email = serializers.EmailField(source='user.username')
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    # Declared explicitly (not left to the model-field default) so an omitted
    # role falls through to PlatformSettings.default_new_member_role in
    # create() below, instead of DRF silently filling in the model default.
    role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, required=False)

    class Meta:
        model = Profile
        fields = ('id', 'email', 'role', 'is_active', 'is_default', 'password')
        read_only_fields = ('is_default',)

    def create(self, validated_data):
        email = validated_data['user']['username'].strip().lower()
        password = validated_data.pop('password', None)
        role = validated_data.get('role') or PlatformSettings.load().default_new_member_role
        organization = self.context['organization']

        user, user_created = User.objects.get_or_create(
            username=email, defaults={'email': email},
        )
        if user_created:
            if not password:
                raise serializers.ValidationError({'password': 'Required for a new person.'})
            user.set_password(password)
            user.save()

        if Profile.objects.filter(user=user, organization=organization).exists():
            raise serializers.ValidationError({'email': 'Already a member of this organization.'})

        # First membership anywhere on the platform becomes their default.
        is_default = not Profile.objects.filter(user=user).exists()
        return Profile.objects.create(
            user=user, organization=organization, role=role, is_default=is_default,
        )

    def update(self, instance, validated_data):
        instance.role = validated_data.get('role', instance.role)
        instance.save()
        return instance


class AdminMembershipSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'organization', 'role', 'is_active')


class AdminUserSerializer(serializers.ModelSerializer):
    """Read-only, platform-wide view of a User and every org they belong to.
    Mutations go through AdminUserViewSet's promote/demote/deactivate/
    reactivate actions rather than a generic update, so this never accepts input.
    """

    email = serializers.CharField(source='username', read_only=True)
    is_platform_admin = serializers.BooleanField(source='is_superuser', read_only=True)
    memberships = AdminMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'is_active', 'is_platform_admin', 'date_joined', 'memberships')


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = (
            'use_real_ocr', 'use_real_llm', 'use_local_ocr', 'use_anthropic_llm',
            'default_new_org_active', 'default_new_member_role', 'updated_at',
        )
        read_only_fields = ('updated_at',)


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
    organization = serializers.StringRelatedField(read_only=True)

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
