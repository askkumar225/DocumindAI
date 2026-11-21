"""
URL configuration for the audit app — Day 6.

Prefix: /api/audit/

    GET /api/audit/                          → full audit log (ADMIN only)
    GET /api/audit/documents/{doc_id}/       → document activity timeline
"""

from django.urls import path

from .views import AuditLogListView, DocumentAuditLogView

urlpatterns = [
    path("audit/", AuditLogListView.as_view(), name="audit-log-list"),
    path(
        "audit/documents/<int:doc_id>/",
        DocumentAuditLogView.as_view(),
        name="audit-log-document",
    ),
]
