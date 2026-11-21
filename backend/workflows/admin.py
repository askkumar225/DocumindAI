"""
Django admin configuration for the workflows app — Day 6.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import ApprovalRequest, DocumentPermission, DocumentRisk


# ─── Document Permission ───────────────────────────────────────────────────────

@admin.register(DocumentPermission)
class DocumentPermissionAdmin(admin.ModelAdmin):
    list_display = [
        "document",
        "target",
        "can_view",
        "can_download",
        "can_edit",
        "can_approve",
        "can_delete",
        "granted_by",
        "created_at",
    ]
    list_filter = ["can_view", "can_approve", "can_delete", "role"]
    search_fields = ["document__title", "user__username", "role"]
    autocomplete_fields = ["document", "user", "granted_by"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]

    @admin.display(description="Target (user or role)")
    def target(self, obj):
        if obj.user:
            return f"User: {obj.user.username}"
        return f"Role: {obj.role}"


# ─── Approval Request ──────────────────────────────────────────────────────────

@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "document",
        "status_badge",
        "requested_by",
        "reviewer",
        "created_at",
        "reviewed_at",
    ]
    list_filter = ["status"]
    search_fields = [
        "document__title",
        "requested_by__username",
        "reviewer__username",
    ]
    autocomplete_fields = ["document", "requested_by", "reviewer"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at"]
    ordering = ["-created_at"]

    STATUS_COLORS = {
        "PENDING": "#f59e0b",
        "APPROVED": "#10b981",
        "REJECTED": "#ef4444",
        "NEEDS_CHANGES": "#6366f1",
    }

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#6b7280")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.status,
        )


# ─── Document Risk ─────────────────────────────────────────────────────────────

@admin.register(DocumentRisk)
class DocumentRiskAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "document",
        "title",
        "severity_badge",
        "page_number",
        "created_at",
    ]
    list_filter = ["severity", "overall_severity"]
    search_fields = ["document__title", "title", "description"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]

    SEVERITY_COLORS = {
        "LOW": "#10b981",
        "MEDIUM": "#f59e0b",
        "HIGH": "#f97316",
        "CRITICAL": "#ef4444",
    }

    @admin.display(description="Severity")
    def severity_badge(self, obj):
        color = self.SEVERITY_COLORS.get(obj.severity, "#6b7280")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.severity,
        )
