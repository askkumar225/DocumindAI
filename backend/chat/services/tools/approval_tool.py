"""
Approval Tool — find pending approvals for the current user.
"""
import logging
logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Return pending approval requests assigned to or submitted by the user.

    parameters:
        status   — PENDING / APPROVED / REJECTED / NEEDS_CHANGES (default: PENDING)
        priority — filter by priority

    Returns:
        { "approvals": [...], "count": int }
    """
    from workflows.models import ApprovalRequest
    from django.db.models import Q

    status_filter   = parameters.get("status", "PENDING")
    priority_filter = parameters.get("priority")
    role            = getattr(user, "role", "")

    qs = ApprovalRequest.objects.select_related(
        "document", "requested_by", "reviewer"
    )

    if role == "ADMIN":
        qs = qs.filter(status=status_filter)
    elif role == "MANAGER":
        qs = qs.filter(
            Q(reviewer=user) | Q(document__uploaded_by=user),
            status=status_filter,
        )
    else:
        qs = qs.filter(requested_by=user, status=status_filter)

    if priority_filter:
        qs = qs.filter(priority=priority_filter)

    qs = qs.order_by(
        # URGENT first, then HIGH, NORMAL, LOW
        "-priority",
        "due_date",
        "-created_at",
    )[:20]

    approvals = []
    for a in qs:
        approvals.append({
            "id":             a.id,
            "document_id":    a.document_id,
            "document_title": a.document.title,
            "document_type":  a.document.document_type,
            "status":         a.status,
            "priority":       a.priority,
            "due_date":       a.due_date.isoformat() if a.due_date else None,
            "submitted_by":   a.requested_by.username if a.requested_by else "—",
            "reviewer":       a.reviewer.username if a.reviewer else "—",
            "created_at":     a.created_at.isoformat(),
        })

    return {
        "approvals": approvals,
        "count":     len(approvals),
        "status":    status_filter,
    }
