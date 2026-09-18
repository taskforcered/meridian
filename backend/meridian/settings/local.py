from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

# Real subdomain testing locally needs a wildcard DNS name pointing at
# 127.0.0.1 (e.g. MERIDIAN_ROOT_DOMAIN=lvh.me, then visit
# acme.lvh.me:8000) — set it in backend/.env if you want that. Otherwise
# leave it unset and use the X-Tenant-Slug header override instead (that's
# what the frontend falls back to when it's not running under a subdomain).
