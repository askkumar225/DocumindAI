"""
Workflow views for DocuMind AI — Day 6.

Endpoints:

    Document Permissions:
        POST   /api/workflows/permissions/          → grant permission
        GET    /api/workflows/permissions/          → list permissions (admin/manager)
        DELETE /api/workflows/permissions/{id}/     → revoke permission

    Approval Requests:
        POST   /api/workflows/approvals/            → create approval request
        GET    /api/workflows/approvals/            → list approvals (scoped by role)
        GET    /api/workflows/approvals/pending/    → list PENDING approvals for reviewer
        POST   /api/workflows/approvals/{id}/approve/  → approve
        POST   /api/workflows/approvals/{id}/reject/   → reject
        POST   /api/workflows/approvals/{id}/needs_changes/ → request changes

    Document Risks:
        GET    /api/workflows/documents/{doc_id}/risks/  → list risks for a document
"""

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework import mixins

from audit.models import AuditLog
from audit.utils import log_action
from documents.models import Document

from .models import ApprovalRequest, DocumentPermission, DocumentRisk
from .permissions import IsAdmin, IsManagerOrAdmin, IsEmployee
from .serializers import (
    ApprovalActionSerializer,
    ApprovalRequestCreateSerializer,
    ApprovalRequestSerializer,
    DocumentPermissionSerializer,
    DocumentRiskSerializer,
)
from .services import send_approval_notification, send_decision_notification

logger = logging.getLogger(__name__)


# ─── Helper: get document or 404 + check access ───────────────────────────────

def _get_document_or_404(pk, user) -> Document:
    """
    Return document by PK.
    Admins see everything; others must own the doc or have a permission row.
    Raises NotFound or PermissionDenied as appropriate.
    """
    try:
        doc = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        raise NotFound("Document not found.")

    if getattr(user, "role", None) == "ADMIN":
        return doc

    if doc.uploaded_by_id == user.pk:
        return doc

    # Check explicit user or role permission
    has_perm = DocumentPermission.objects.filter(
        document=doc,
        can_view=True,
    ).filter(
        # user-level OR role-level
        **{"user": user}
    ).exists() or DocumentPermission.objects.filter(
        document=doc,
        role=getattr(user, "role", ""),
        can_view=True,
    ).exists()

    if not has_perm:
        raise PermissionDenied("You do not have permission to access this document.")

    return doc


# ─── Document Permission ViewSet ───────────────────────────────────────────────

class DocumentPermissionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    """
    Manage document-level permissions.

    Only ADMIN or MANAGER can grant/revoke permissions.

    GET  /api/workflows/permissions/
        ADMIN  → all permissions
        MANAGER → permissions for documents they can access

    POST /api/workflows/permissions/
        Body: { document, user|role, can_view, can_download, ... }

    DELETE /api/workflows/permissions/{id}/
        ADMIN only.
    """

    serializer_class = DocumentPermissionSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = DocumentPermission.objects.select_related(
            "document", "user", "granted_by"
        )

        if getattr(user, "role", None) == "ADMIN":
            return qs.all()

        # Managers see permissions on documents they own or are reviewers of
        return qs.filter(document__uploaded_by=user)

    def perform_create(self, serializer):
        perm = serializer.save(granted_by=self.request.user)

        log_action(
            user=self.request.user,
            action=AuditLog.PERMISSION_GRANTED,
            document=perm.document,
            description=(
                f"Permission granted to "
                f"{'user:' + perm.user.username if perm.user else 'role:' + perm.role} "
                f"on '{perm.document.title}'."
            ),
            request=self.request,
            extra_data={
                "can_view": perm.can_view,
                "can_download": perm.can_download,
                "can_edit": perm.can_edit,
                "can_approve": perm.can_approve,
                "can_delete": perm.can_delete,
            },
        )

    def perform_destroy(self, instance):
        log_action(
            user=self.request.user,
            action=AuditLog.PERMISSION_REVOKED,
            document=instance.document,
            description=(
                f"Permission revoked from "
                f"{'user:' + instance.user.username if instance.user else 'role:' + instance.role} "
                f"on '{instance.document.title}'."
            ),
            request=self.request,
        )
        instance.delete()

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsManagerOrAdmin()]


# ─── Approval Request ViewSet ──────────────────────────────────────────────────

class ApprovalRequestViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    GenericViewSet,
):
    """
    Manage approval requests.

    POST   /api/workflows/approvals/               → create (any authenticated user)
    GET    /api/workflows/approvals/               → list (scoped by role)
    GET    /api/workflows/approvals/{id}/          → retrieve
    GET    /api/workflows/approvals/pending/       → PENDING approvals assigned to me
    POST   /api/workflows/approvals/{id}/approve/  → MANAGER/ADMIN
    POST   /api/workflows/approvals/{id}/reject/   → MANAGER/ADMIN
    POST   /api/workflows/approvals/{id}/needs_changes/ → MANAGER/ADMIN
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return ApprovalRequestCreateSerializer
        if self.action in ("approve", "reject", "needs_changes", "request_changes"):
            return ApprovalActionSerializer
        return ApprovalRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ApprovalRequest.objects.select_related(
            "document", "requested_by", "reviewer"
        )

        role = getattr(user, "role", None)

        if role == "ADMIN":
            return qs.all()

        if role == "MANAGER":
            # Managers see approvals assigned to them OR for documents they own
            return qs.filter(
                reviewer=user
            ) | qs.filter(document__uploaded_by=user)

        # Employees see their own submissions
        return qs.filter(requested_by=user)

    def perform_create(self, serializer):
        document = serializer.validated_data["document"]
        reviewer = serializer.validated_data["reviewer"]

        # Prevent duplicate pending requests
        if ApprovalRequest.objects.filter(
            document=document,
            status="PENDING",
        ).exists():
            raise ValidationError(
                "This document already has a pending approval request."
            )

        approval = serializer.save(
            requested_by=self.request.user,
            priority=serializer.validated_data.get("priority", "NORMAL"),
            due_date=serializer.validated_data.get("due_date"),
        )

        # Update document status
        document.status = "PENDING_APPROVAL"
        document.save(update_fields=["status", "updated_at"])

        # Audit
        log_action(
            user=self.request.user,
            action=AuditLog.DOCUMENT_SUBMITTED,
            document=document,
            description=f"'{document.title}' submitted for approval to {reviewer.username}.",
            request=self.request,
        )

        # Notify reviewer
        send_approval_notification(approval)

        logger.info(
            "Approval request #%s created for document %s by %s → reviewer %s",
            approval.pk, document.pk, self.request.user.username, reviewer.username,
        )

    # ── GET /api/workflows/approvals/pending/ ─────────────────────────────────

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """
        List PENDING approval requests assigned to the current user.
        ADMIN sees all pending requests.
        """
        user = request.user
        if getattr(user, "role", None) == "ADMIN":
            qs = ApprovalRequest.objects.filter(status="PENDING").select_related(
                "document", "requested_by", "reviewer"
            )
        else:
            qs = ApprovalRequest.objects.filter(
                reviewer=user, status="PENDING"
            ).select_related("document", "requested_by", "reviewer")

        serializer = ApprovalRequestSerializer(qs, many=True)
        return Response(serializer.data)

    # ── POST /api/workflows/approvals/{id}/approve/ ───────────────────────────

    @action(detail=True, methods=["post"], url_path="approve",
            permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def approve(self, request, pk=None):
        """Approve a pending approval request."""
        approval = self._get_pending_approval(pk, request.user)
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approval.status = "APPROVED"
        approval.comments = serializer.validated_data.get("comments", "")
        approval.reviewed_at = timezone.now()
        approval.save()

        approval.document.status = "APPROVED"
        approval.document.save(update_fields=["status", "updated_at"])

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_APPROVED,
            document=approval.document,
            description=f"'{approval.document.title}' approved by {request.user.username}.",
            request=request,
            extra_data={"comments": approval.comments},
        )

        send_decision_notification(approval)

        return Response(
            ApprovalRequestSerializer(approval).data,
            status=status.HTTP_200_OK,
        )

    # ── POST /api/workflows/approvals/{id}/reject/ ────────────────────────────

    @action(detail=True, methods=["post"], url_path="reject",
            permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def reject(self, request, pk=None):
        """Reject a pending approval request."""
        approval = self._get_pending_approval(pk, request.user)
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approval.status = "REJECTED"
        approval.comments = serializer.validated_data.get("comments", "")
        approval.reviewed_at = timezone.now()
        approval.save()

        approval.document.status = "REJECTED"
        approval.document.save(update_fields=["status", "updated_at"])

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_REJECTED,
            document=approval.document,
            description=f"'{approval.document.title}' rejected by {request.user.username}.",
            request=request,
            extra_data={"comments": approval.comments},
        )

        send_decision_notification(approval)

        return Response(
            ApprovalRequestSerializer(approval).data,
            status=status.HTTP_200_OK,
        )

    # ── POST /api/workflows/approvals/{id}/needs_changes/ ─────────────────────

    @action(detail=True, methods=["post"], url_path="needs_changes",
            permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def needs_changes(self, request, pk=None):
        """Mark a pending approval as needing changes."""
        return self._do_needs_changes(request, pk)

    # ── POST /api/workflows/approvals/{id}/request_changes/ ───────────────────

    @action(detail=True, methods=["post"], url_path="request_changes",
            permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def request_changes(self, request, pk=None):
        """Alias for needs_changes — explicit PRD URL."""
        return self._do_needs_changes(request, pk)

    def _do_needs_changes(self, request, pk):
        """Shared logic for needs_changes / request_changes."""
        approval = self._get_pending_approval(pk, request.user)
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approval.status = "NEEDS_CHANGES"
        approval.comments = serializer.validated_data.get("comments", "")
        approval.reviewed_at = timezone.now()
        approval.save()

        approval.document.status = "NEEDS_CHANGES"
        approval.document.save(update_fields=["status", "updated_at"])

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_NEEDS_CHANGES,
            document=approval.document,
            description=(
                f"'{approval.document.title}' needs changes — "
                f"requested by {request.user.username}."
            ),
            request=request,
            extra_data={"comments": approval.comments},
        )

        send_decision_notification(approval)

        return Response(
            ApprovalRequestSerializer(approval).data,
            status=status.HTTP_200_OK,
        )

    # ── Internal helper ────────────────────────────────────────────────────────

    def _get_pending_approval(self, pk, user) -> ApprovalRequest:
        """
        Fetch an approval request by PK, validate it's PENDING, and
        verify the user is the assigned reviewer (or ADMIN).
        """
        try:
            approval = ApprovalRequest.objects.select_related(
                "document", "requested_by", "reviewer"
            ).get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            raise NotFound("Approval request not found.")

        if approval.status != "PENDING":
            raise ValidationError(
                f"This approval request is already '{approval.status}' and cannot be actioned."
            )

        role = getattr(user, "role", None)
        if role != "ADMIN" and approval.reviewer_id != user.pk:
            raise PermissionDenied("You are not the assigned reviewer for this approval request.")

        return approval


# ─── Document Risks View ───────────────────────────────────────────────────────

class DocumentRiskListView(APIView):
    """
    GET /api/workflows/documents/{doc_id}/risks/

    Returns all AI-detected risks for a document.

    Access rules:
        - ADMIN: always
        - MANAGER/EMPLOYEE: must own the document or have can_view permission
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        doc = _get_document_or_404(doc_id, request.user)

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_VIEWED,
            document=doc,
            description=f"Risk list for '{doc.title}' viewed by {request.user.username}.",
            request=request,
        )

        risks = DocumentRisk.objects.filter(document=doc)
        serializer = DocumentRiskSerializer(risks, many=True)

        # Include overall severity from the first risk record (all share the same value)
        overall = risks.first().overall_severity if risks.exists() else None

        return Response({
            "document_id": doc.pk,
            "document_title": doc.title,
            "overall_severity": overall,
            "count": risks.count(),
            "risks": serializer.data,
        })
