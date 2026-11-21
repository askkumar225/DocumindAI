"""
Notification model for DocuMind AI — Day 6.

In-database notifications displayed inside the dashboard.
Day 7+ can extend this with WebSocket push or email delivery.
"""

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    An in-app notification for a specific user.

    Notification types guide the frontend on which icon / colour to
    display and whether to include a link to a document or approval.
    """

    # ── Notification type constants ────────────────────────────────────────────
    TYPE_INFO = "INFO"
    TYPE_SUCCESS = "SUCCESS"
    TYPE_WARNING = "WARNING"
    TYPE_ERROR = "ERROR"

    TYPE_CHOICES = [
        (TYPE_INFO, "Info"),
        (TYPE_SUCCESS, "Success"),
        (TYPE_WARNING, "Warning"),
        (TYPE_ERROR, "Error"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    title = models.CharField(max_length=255)

    message = models.TextField()

    notification_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_INFO,
    )

    # Optional link to related document
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    # Optional link to related approval request
    approval_request = models.ForeignKey(
        "workflows.ApprovalRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]

    def __str__(self):
        status = "read" if self.is_read else "unread"
        return f"[{status}] {self.user.username}: {self.title}"
