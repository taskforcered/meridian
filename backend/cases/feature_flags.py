from django.conf import settings as django_settings


def is_enabled(flag_name: str) -> bool:
    """Effective value of a USE_* flag: DB override if set, else the env default."""
    from .models import PlatformSettings

    override = getattr(PlatformSettings.load(), flag_name.lower(), None)
    if override is not None:
        return override
    return getattr(django_settings, flag_name, False)
