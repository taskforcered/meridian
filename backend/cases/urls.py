from django.urls import path
from rest_framework.routers import DefaultRouter

from .auth_views import LoginView, LogoutView, MeView
from .views import (
    AdminUserViewSet,
    CaseViewSet,
    MembershipViewSet,
    OrganizationViewSet,
    PlatformSettingsView,
    SourceDocumentViewSet,
    TimelineEventViewSet,
)

router = DefaultRouter()
router.register('cases', CaseViewSet)
router.register('documents', SourceDocumentViewSet)
router.register('events', TimelineEventViewSet)
router.register('members', MembershipViewSet, basename='member')
router.register('admin/organizations', OrganizationViewSet, basename='organization')
router.register('admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = router.urls + [
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/me/', MeView.as_view()),
    path('admin/settings/', PlatformSettingsView.as_view()),
]
