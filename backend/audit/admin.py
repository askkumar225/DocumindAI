"""
Django admin configuration for the audit app — Day 6.
"""

from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "created_at",
        "user",
        "action",
        "document",
        "ip_address",
        "short_description",
    ]
    list_filter = ["action"]
    search_fields = [
        "user__username",
        "action",
        "document__title",
        "description",
        "ip_address",
    ]
    readonly_fields = [
        "user",
        "action",
        "document",
        "description",
        "extra_data",
        "ip_address",
        "created_at",
    ]
    ordering = ["-created_at"]

    # Audit logs must never be modified — make the whole record read-only
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete audit records
        return request.user.is_superuser

    @admin.display(description="Description")
    def short_description(self, obj):
        return obj.description[:80] + "…" if len(obj.description) > 80 else obj.description
