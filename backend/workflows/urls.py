"""
URL configuration for the workflows app — Day 6.

Prefix: /api/workflows/

Permissions:
    POST   /api/workflows/permissions/                   → grant permission
    GET    /api/workflows/permissions/                   → list permissions
    DELETE /api/workflows/permissions/{id}/              → revoke permission

Approvals:
    POST   /api/workflows/approvals/                     → create approval request
    GET    /api/workflows/approvals/                     → list approvals
    GET    /api/workflows/approvals/{id}/                → retrieve approval
    GET    /api/workflows/approvals/pending/             → pending approvals for me
    POST   /api/workflows/approvals/{id}/approve/        → approve
    POST   /api/workflows/approvals/{id}/reject/         → reject
    POST   /api/workflows/approvals/{id}/needs_changes/  → needs changes

Risks:
    GET    /api/workflows/documents/{doc_id}/risks/      → risk list for a document
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApprovalRequestViewSet,
    DocumentPermissionViewSet,
    DocumentRiskListView,
)

router = DefaultRouter()
router.register(r"permissions", DocumentPermissionViewSet, basename="document-permission")
router.register(r"approvals", ApprovalRequestViewSet, basename="approval-request")

urlpatterns = [
    path("workflows/", include(router.urls)),
    path(
        "workflows/documents/<int:doc_id>/risks/",
        DocumentRiskListView.as_view(),
        name="document-risks",
    ),
]
