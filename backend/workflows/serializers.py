"""
Serializers for the workflows app — Day 6.

Covers:
    DocumentPermissionSerializer   — create / list permissions
    ApprovalRequestSerializer      — full detail view
    ApprovalRequestCreateSerializer — create an approval request
    ApprovalActionSerializer       — approve / reject action payload
    DocumentRiskSerializer         — read-only risk items
    DocumentRiskSummarySerializer  — compact summary (title + severity)
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ApprovalRequest, DocumentPermission, DocumentRisk

User = get_user_model()


# ─── Nested helpers ────────────────────────────────────────────────────────────

class _UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]


# ─── Document Permission ───────────────────────────────────────────────────────

class DocumentPermissionSerializer(serializers.ModelSerializer):
    """
    Read + Write serializer for DocumentPermission.

    Validation ensures exactly one of `user` or `role` is supplied.
    """

    user_detail = _UserBriefSerializer(source="user", read_only=True)
    granted_by_detail = _UserBriefSerializer(source="granted_by", read_only=True)

    class Meta:
        model = DocumentPermission
        fields = [
            "id",
            "document",
            "user",
            "user_detail",
            "role",
            "can_view",
            "can_download",
            "can_edit",
            "can_approve",
            "can_delete",
            "granted_by",
            "granted_by_detail",
            "created_at",
        ]
        read_only_fields = ["id", "granted_by", "granted_by_detail", "created_at"]

    def validate(self, attrs):
        user = attrs.get("user")
        role = attrs.get("role", "").strip()

        if not user and not role:
            raise serializers.ValidationError(
                "Either 'user' or 'role' must be provided."
            )
        if user and role:
            raise serializers.ValidationError(
                "Provide either 'user' or 'role', not both."
            )
        return attrs


# ─── Approval Request ──────────────────────────────────────────────────────────

class ApprovalRequestSerializer(serializers.ModelSerializer):
    """Full detail serializer — used for GET responses."""

    requested_by_detail = _UserBriefSerializer(source="requested_by", read_only=True)
    reviewer_detail = _UserBriefSerializer(source="reviewer", read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)
    document_status = serializers.CharField(source="document.status", read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            "id",
            "document",
            "document_title",
            "document_status",
            "requested_by",
            "requested_by_detail",
            "reviewer",
            "reviewer_detail",
            "status",
            "comments",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "status",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]


class ApprovalRequestCreateSerializer(serializers.ModelSerializer):
    """Write serializer — used for POST /api/workflows/approvals/."""

    class Meta:
        model = ApprovalRequest
        fields = ["document", "reviewer", "priority", "due_date"]

    def validate_reviewer(self, reviewer):
        if getattr(reviewer, "role", None) not in ("MANAGER", "ADMIN"):
            raise serializers.ValidationError(
                "Reviewer must have the MANAGER or ADMIN role."
            )
        return reviewer


class ApprovalActionSerializer(serializers.Serializer):
    """Payload for approve / reject actions."""

    comments = serializers.CharField(required=False, allow_blank=True, default="")


# ─── Document Risk ─────────────────────────────────────────────────────────────

class DocumentRiskSerializer(serializers.ModelSerializer):
    """Full risk detail — used by the document detail and risk list endpoints."""

    class Meta:
        model = DocumentRisk
        fields = [
            "id",
            "document",
            "title",
            "description",
            "severity",
            "source_text",
            "page_number",
            "overall_severity",
            "created_at",
        ]
        read_only_fields = fields


class DocumentRiskSummarySerializer(serializers.ModelSerializer):
    """Compact risk — used in document list cards."""

    class Meta:
        model = DocumentRisk
        fields = ["id", "title", "severity"]
        read_only_fields = fields
