from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile


def _org_payload(org):
    if org is None:
        return None
    return {'id': org.pk, 'name': org.name, 'slug': org.slug}


def _membership_payload(profile):
    return {
        'organization': _org_payload(profile.organization),
        'role': profile.role,
        'is_default': profile.is_default,
    }


def _user_payload(user, active_org=None):
    memberships = list(
        Profile.objects.filter(user=user, is_active=True).select_related('organization')
    )
    active_profile = None
    if active_org is not None:
        active_profile = next((p for p in memberships if p.organization_id == active_org.id), None)

    return {
        'id': user.pk,
        'username': user.username,
        'email': user.email,
        'is_platform_admin': user.is_superuser,
        'memberships': [_membership_payload(p) for p in memberships],
        # Only meaningful once a tenant is actually resolved (subdomain, or
        # the X-Tenant-Slug override after the frontend has picked one) AND
        # it matches one of this user's own memberships. Null otherwise —
        # the frontend falls back to `memberships` to decide what to do next.
        'role': active_profile.role if active_profile else None,
        'organization': _org_payload(active_profile.organization) if active_profile else None,
    }


class LoginView(APIView):
    """Single login for everyone — no tenant/subdomain required. Identity is
    email (stored as User.username, which is already globally unique — see
    the ADR note in models.py... deliberately not a custom user model).
    Which organization(s) the caller lands in is a client-side decision made
    from `memberships` after this returns, not part of authenticating."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if user is None or not user.is_active:
            return Response({'detail': 'Invalid credentials.'}, status=400)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': _user_payload(user, active_org=request.tenant)})


class LogoutView(APIView):
    def post(self, request):
        request.auth.delete()
        return Response(status=204)


class MeView(APIView):
    def get(self, request):
        return Response(_user_payload(request.user, active_org=request.tenant))

    def patch(self, request):
        """Set which membership this user lands in on future logins."""
        slug = request.data.get('default_organization_slug', '')
        profile = Profile.objects.filter(
            user=request.user, organization__slug=slug, is_active=True,
        ).first()
        if profile is None:
            return Response({'detail': 'Not a member of that organization.'}, status=400)
        Profile.objects.filter(user=request.user).update(is_default=False)
        profile.is_default = True
        profile.save(update_fields=['is_default'])
        return Response(_user_payload(request.user, active_org=request.tenant))
