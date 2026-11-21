"""
Django admin configuration for the notifications app — Day 6.
"""

from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "notification_type",
        "title",
        "is_read",
        "document",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read"]
    search_fields = ["user__username", "title", "message", "document__title"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]
    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} notification(s) marked as read.")

    @admin.action(description="Mark selected notifications as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} notification(s) marked as unread.")
