from django.urls import path
from rest_framework.routers import DefaultRouter

from .auth_views import LoginView, LogoutView, MeView
from .views import CaseViewSet, SourceDocumentViewSet, TimelineEventViewSet

router = DefaultRouter()
router.register('cases', CaseViewSet)
router.register('documents', SourceDocumentViewSet)
router.register('events', TimelineEventViewSet)

urlpatterns = router.urls + [
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/me/', MeView.as_view()),
]
