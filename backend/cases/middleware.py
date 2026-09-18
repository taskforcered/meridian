from django.conf import settings

from .models import Organization

# Subdomain labels that never identify a tenant, even if someone squats an
# Organization row with that slug.
RESERVED_SLUGS = {'www', 'admin', 'api', 'app'}


class TenantMiddleware:
    """Resolves request.tenant (an Organization, or None) for every request.

    Primary path: the Host header's subdomain, e.g. acme.meridianapp.com ->
    slug 'acme'. This is what "subdomain per tenant" means operationally.

    Override path: an X-Tenant-Slug header. This lets a platform admin
    "enter" any tenant from the platform host (which has no subdomain of its
    own) — but the header is only ever a *routing hint*. It is not trusted
    for authorization: IsTenantMember/IsOrgAdmin independently verify the
    authenticated user is either a superuser or an actual member of the
    resolved tenant before any tenant-scoped data is returned. A non-admin
    sending a spoofed header just gets 403, because their profile's
    organization won't match request.tenant.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = self._resolve(request)
        return self.get_response(request)

    def _resolve(self, request):
        override_slug = request.headers.get('X-Tenant-Slug', '').strip().lower()
        if override_slug:
            org = Organization.objects.filter(slug=override_slug, is_active=True).first()
            if org is not None:
                return org

        root_domain = (settings.MERIDIAN_ROOT_DOMAIN or '').lower()
        if not root_domain:
            return None

        host = request.get_host().split(':')[0].lower()
        suffix = '.' + root_domain
        if host == root_domain or not host.endswith(suffix):
            return None

        slug = host[: -len(suffix)]
        if not slug or '.' in slug or slug in RESERVED_SLUGS:
            return None

        return Organization.objects.filter(slug=slug, is_active=True).first()
