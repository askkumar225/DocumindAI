from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, ComparisonViewSet

router = DefaultRouter()

router.register(
    "documents",
    DocumentViewSet,
    basename="documents",
)

router.register(
    "comparisons",
    ComparisonViewSet,
    basename="comparisons",
)

# Router auto-generates:
#   GET/POST              /api/documents/
#   GET/PUT/PATCH/DELETE  /api/documents/{id}/
#   POST                  /api/documents/upload/
#   GET                   /api/documents/{id}/content/
#   GET                   /api/documents/{id}/analysis/
#   GET                   /api/documents/{id}/deep_analysis/
#
#   POST   /api/comparisons/
#   GET    /api/comparisons/
#   GET    /api/comparisons/{id}/
#   DELETE /api/comparisons/{id}/
#   POST   /api/comparisons/{id}/run/

urlpatterns = router.urls
