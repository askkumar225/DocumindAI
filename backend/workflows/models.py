"""
Workflow models for DocuMind AI — Day 6.

Three models:
    DocumentPermission  — per-document, per-user or per-role access grants
    ApprovalRequest     — tracks the approval lifecycle for a document
    DocumentRisk        — AI-detected risk items within a document
"""

from django.conf import settings
from django.db import models


# ─── Document Permission ───────────────────────────────────────────────────────

class DocumentPermission(models.Model):
    """
    Grants a specific user (or all users of a role) access to a document.

    Either `user` or `role` must be set — not both, not neither.
    Object-level permission checks enforce the correct combination.

    Permission flags:
        can_view      — read document content and metadata
        can_download  — download the original file
        can_edit      — edit document title / metadata
        can_approve   — approve or reject approval requests
        can_delete    — delete the document
    """

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        related_name="permissions",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_permissions",
    )

    # Role-level grant (e.g. "MANAGER" → can view all documents)
    role = models.CharField(max_length=30, blank=True)

    can_view = models.BooleanField(default=True)
    can_download = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_permissions",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document Permission"
        verbose_name_plural = "Document Permissions"

    def __str__(self):
        target = self.user.username if self.user else f"role:{self.role}"
        return f"{self.document.title} → {target}"


# ─── Approval Request ──────────────────────────────────────────────────────────

class ApprovalRequest(models.Model):
    """
    Represents one approval cycle for a document.

    Lifecycle:
        PENDING → APPROVED
               → REJECTED → NEEDS_CHANGES

    A document can have multiple approval requests over its lifetime
    (e.g. after changes are made and resubmitted).
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("NEEDS_CHANGES", "Needs Changes"),
    ]

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        related_name="approval_requests",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_approvals",
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_approvals",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    comments = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Day 7 additions
    due_date = models.DateTimeField(null=True, blank=True)

    PRIORITY_CHOICES = [
        ("LOW",    "Low"),
        ("NORMAL", "Normal"),
        ("HIGH",   "High"),
        ("URGENT", "Urgent"),
    ]
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="NORMAL",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Approval Request"
        verbose_name_plural = "Approval Requests"

    def __str__(self):
        return f"Approval #{self.pk} — {self.document.title} [{self.status}]"

    @property
    def is_pending(self) -> bool:
        return self.status == "PENDING"


# ─── Document Risk ─────────────────────────────────────────────────────────────

class DocumentRisk(models.Model):
    """
    An AI-detected risk item within a document.

    AI risk detection is an assistance mechanism — not a legal decision.
    A manager must review every risk before taking action.

    Severity levels: LOW → MEDIUM → HIGH → CRITICAL
    """

    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        related_name="risks",
    )

    title = models.CharField(max_length=255)

    description = models.TextField()

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="MEDIUM",
    )

    # The exact text from the document that triggered this risk
    source_text = models.TextField(blank=True)

    page_number = models.IntegerField(null=True, blank=True)

    # Overall risk score for the document (set once per risk-detection run)
    overall_severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [
            models.Case(
                models.When(severity="CRITICAL", then=0),
                models.When(severity="HIGH", then=1),
                models.When(severity="MEDIUM", then=2),
                models.When(severity="LOW", then=3),
                default=4,
                output_field=models.IntegerField(),
            ),
            "created_at",
        ]
        verbose_name = "Document Risk"
        verbose_name_plural = "Document Risks"

    def __str__(self):
        return f"[{self.severity}] {self.title} — {self.document.title}"
