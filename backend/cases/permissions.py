from rest_framework.permissions import BasePermission

from .models import Profile


def active_membership(user, organization):
    """The caller's Profile for this specific org, or None. A user can have
    several Profile rows (one per org they belong to) — every permission
    check here is scoped to request.tenant, never to "the" profile."""
    if organization is None:
        return None
    return Profile.objects.filter(
        user=user, organization=organization, is_active=True,
    ).first()


class IsPlatformAdmin(BasePermission):
    """Global Admin / "God Mode" — Meridian's own staff, not a member of any
    tenant. Maps to Django's is_superuser rather than a Profile role, since
    platform admins have zero Profile rows."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsTenantMember(BasePermission):
    """Base permission for every tenant-scoped endpoint (cases, documents,
    events, membership). Requires a resolved tenant (see TenantMiddleware)
    and that the caller either has an active membership in it or is a
    platform admin who has "entered" it via the X-Tenant-Slug override —
    that's the whole God-Mode-can-go-into-any-tenant mechanism, enforced
    here rather than trusted from the header itself.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.tenant is None:
            return False
        if request.user.is_superuser:
            return True
        return active_membership(request.user, request.tenant) is not None


class IsOrgAdmin(BasePermission):
    """Tenant Admin — role == 'admin' within request.tenant specifically, or
    a platform admin acting within whichever org they've entered. Used for
    org-membership management (inviting/removing teammates), which is a
    narrower capability than IsAttorneyOrAdmin's case sign-off right."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.tenant is None:
            return False
        if request.user.is_superuser:
            return True
        profile = active_membership(request.user, request.tenant)
        return profile is not None and profile.role == Profile.ROLE_ADMIN


class IsAttorneyOrAdmin(BasePermission):
    """Sign-off right within request.tenant. Always pair with IsTenantMember
    on the same action — this alone doesn't require a resolved tenant."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = active_membership(request.user, request.tenant)
        return profile is not None and profile.role in (Profile.ROLE_ATTORNEY, Profile.ROLE_ADMIN)
