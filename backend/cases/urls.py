from rest_framework.routers import DefaultRouter
from .views import CaseViewSet, SourceDocumentViewSet, TimelineEventViewSet

router = DefaultRouter()
router.register('cases', CaseViewSet)
router.register('documents', SourceDocumentViewSet)
router.register('events', TimelineEventViewSet)

urlpatterns = router.urls
