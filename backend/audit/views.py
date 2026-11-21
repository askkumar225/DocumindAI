"""
Audit log views for DocuMind AI — Day 6.

Endpoints:
    GET /api/audit/                      → full audit log (ADMIN only)
    GET /api/audit/documents/{doc_id}/   → activity for a specific document
                                           (ADMIN, document owner, or reviewer)
"""

import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from workflows.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer

logger = logging.getLogger(__name__)


class AuditLogListView(APIView):
    """
    GET /api/audit/

    Returns the full system audit log. ADMIN only.

    Query params:
        action   — filter by action type (e.g. ?action=DOCUMENT_APPROVED)
        user_id  — filter by user ID
        limit    — max records to return (default 100, max 500)
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = AuditLog.objects.select_related("user", "document").all()

        action_filter = request.query_params.get("action")
        if action_filter:
            qs = qs.filter(action=action_filter)

        user_id = request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        try:
            limit = min(int(request.query_params.get("limit", 100)), 500)
        except (TypeError, ValueError):
            limit = 100

        qs = qs[:limit]
        serializer = AuditLogSerializer(qs, many=True)
        return Response({
            "count": len(serializer.data),
            "results": serializer.data,
        })


class DocumentAuditLogView(APIView):
    """
    GET /api/audit/documents/{doc_id}/

    Returns the activity timeline for a specific document.

    Access:
        - ADMIN: always
        - Document owner: always
        - MANAGER assigned as reviewer: allowed
        - Others: 403
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        from documents.models import Document
        from workflows.models import ApprovalRequest

        # Resolve document
        try:
            doc = Document.objects.get(pk=doc_id)
        except Document.DoesNotExist:
            return Response({"detail": "Document not found."}, status=404)

        user = request.user
        role = getattr(user, "role", None)

        # Access control
        is_owner = doc.uploaded_by_id == user.pk
        is_admin = role == "ADMIN"
        is_reviewer = ApprovalRequest.objects.filter(
            document=doc, reviewer=user
        ).exists()

        if not (is_admin or is_owner or is_reviewer):
            return Response(
                {"detail": "You do not have permission to view this document's audit log."},
                status=403,
            )

        logs = AuditLog.objects.filter(document=doc).select_related("user")
        serializer = AuditLogSerializer(logs, many=True)

        return Response({
            "document_id": doc.pk,
            "document_title": doc.title,
            "count": len(serializer.data),
            "activity": serializer.data,
        })
