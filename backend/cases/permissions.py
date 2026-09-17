from rest_framework.permissions import BasePermission

from .models import Profile


class IsAttorneyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role in (Profile.ROLE_ATTORNEY, Profile.ROLE_ADMIN)
        except Profile.DoesNotExist:
            return False
