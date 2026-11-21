"""
Audit log model for DocuMind AI — Day 6.

Every important action in the system is recorded here to provide
a complete, tamper-evident audit trail for enterprise accountability
and compliance.
"""

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Records a single auditable action performed in the system.

    The `user` field uses SET_NULL so logs are preserved even if a
    user is deleted — the record says "deleted user" rather than
    disappearing entirely.

    Action constants are defined as class attributes for easy import:
        from audit.models import AuditLog
        AuditLog.DOCUMENT_UPLOADED
    """

    # ── Action type constants ──────────────────────────────────────────────────
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"

    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_VIEWED = "DOCUMENT_VIEWED"
    DOCUMENT_DOWNLOADED = "DOCUMENT_DOWNLOADED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    DOCUMENT_UPDATED = "DOCUMENT_UPDATED"

    DOCUMENT_SUBMITTED = "DOCUMENT_SUBMITTED"
    DOCUMENT_APPROVED = "DOCUMENT_APPROVED"
    DOCUMENT_REJECTED = "DOCUMENT_REJECTED"
    DOCUMENT_NEEDS_CHANGES = "DOCUMENT_NEEDS_CHANGES"

    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_REVOKED = "PERMISSION_REVOKED"

    RISK_DETECTED = "RISK_DETECTED"

    USER_CREATED = "USER_CREATED"
    ROLE_CHANGED = "ROLE_CHANGED"

    ACTION_CHOICES = [
        (LOGIN, "Login"),
        (LOGOUT, "Logout"),
        (DOCUMENT_UPLOADED, "Document Uploaded"),
        (DOCUMENT_VIEWED, "Document Viewed"),
        (DOCUMENT_DOWNLOADED, "Document Downloaded"),
        (DOCUMENT_DELETED, "Document Deleted"),
        (DOCUMENT_UPDATED, "Document Updated"),
        (DOCUMENT_SUBMITTED, "Document Submitted for Approval"),
        (DOCUMENT_APPROVED, "Document Approved"),
        (DOCUMENT_REJECTED, "Document Rejected"),
        (DOCUMENT_NEEDS_CHANGES, "Document Needs Changes"),
        (PERMISSION_GRANTED, "Permission Granted"),
        (PERMISSION_REVOKED, "Permission Revoked"),
        (RISK_DETECTED, "Risk Detected"),
        (USER_CREATED, "User Created"),
        (ROLE_CHANGED, "Role Changed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    action = models.CharField(
        max_length=100,
        choices=ACTION_CHOICES,
    )

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    description = models.TextField(blank=True)

    # Extra structured context — e.g. {"old_role": "EMPLOYEE", "new_role": "MANAGER"}
    extra_data = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["document", "-created_at"]),
        ]

    def __str__(self):
        username = self.user.username if self.user else "deleted-user"
        doc = f" | {self.document.title}" if self.document else ""
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {username} — {self.action}{doc}"
