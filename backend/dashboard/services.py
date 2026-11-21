"""
Dashboard services — aggregated stats, insights, and analytics.

All queries are permission-scoped to the requesting user's role:
    ADMIN   → system-wide totals
    MANAGER → own documents + assigned approvals
    EMPLOYEE → own documents only
"""

import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


def get_stats(user) -> dict:
    """
    Return headline statistics for the dashboard.

    Returns:
        {
            total_documents, processed_documents, pending_approvals,
            high_risk_documents, approved_documents, failed_documents,
            total_conversations, unread_notifications
        }
    """
    from documents.models import Document
    from workflows.models import ApprovalRequest, DocumentRisk
    from chat.models import Conversation
    from notifications.models import Notification

    role = getattr(user, "role", "EMPLOYEE")
    docs = _authorized_docs(user, role)

    total_documents     = docs.count()
    processed_documents = docs.filter(
        status__in=["PROCESSED", "APPROVED", "PENDING_APPROVAL", "REVIEW_REQUIRED"]
    ).count()
    failed_documents    = docs.filter(status="FAILED").count()
    approved_documents  = docs.filter(status="APPROVED").count()

    # Pending approvals
    if role == "ADMIN":
        pending_approvals = ApprovalRequest.objects.filter(status="PENDING").count()
    elif role == "MANAGER":
        pending_approvals = ApprovalRequest.objects.filter(
            reviewer=user, status="PENDING"
        ).count()
    else:
        pending_approvals = ApprovalRequest.objects.filter(
            requested_by=user, status="PENDING"
        ).count()

    # High-risk documents
    high_risk_ids = DocumentRisk.objects.filter(
        document__in=docs,
        severity__in=["HIGH", "CRITICAL"],
    ).values_list("document_id", flat=True).distinct()
    high_risk_documents = len(set(high_risk_ids))

    # Conversations
    total_conversations = Conversation.objects.filter(user=user).count()

    # Unread notifications
    unread_notifications = Notification.objects.filter(
        user=user, is_read=False
    ).count()

    return {
        "total_documents":     total_documents,
        "processed_documents": processed_documents,
        "pending_approvals":   pending_approvals,
        "high_risk_documents": high_risk_documents,
        "approved_documents":  approved_documents,
        "failed_documents":    failed_documents,
        "total_conversations": total_conversations,
        "unread_notifications": unread_notifications,
    }


def get_insights(user) -> list:
    """
    Return AI-style insight cards for the dashboard.

    Each insight:
        { type, title, message, count, severity, action_url }
    """
    from documents.models import Document
    from workflows.models import ApprovalRequest, DocumentRisk

    role = getattr(user, "role", "EMPLOYEE")
    docs = _authorized_docs(user, role)
    insights = []

    # 1 — Pending approvals
    if role in ("ADMIN", "MANAGER"):
        pending = ApprovalRequest.objects.filter(
            reviewer=user, status="PENDING"
        ) if role == "MANAGER" else ApprovalRequest.objects.filter(status="PENDING")
        urgent  = pending.filter(priority__in=["HIGH", "URGENT"])
        count   = pending.count()
        if count > 0:
            insights.append({
                "type":       "approval",
                "title":      f"{count} pending approval{'s' if count != 1 else ''}",
                "message":    f"{urgent.count()} high-priority document{'s' if urgent.count() != 1 else ''} need urgent review.",
                "count":      count,
                "severity":   "HIGH" if urgent.count() > 0 else "MEDIUM",
                "action_url": "/review",
            })

    # 2 — High-risk documents
    high_risk_doc_ids = set(
        DocumentRisk.objects.filter(
            document__in=docs, severity__in=["HIGH", "CRITICAL"]
        ).values_list("document_id", flat=True)
    )
    if high_risk_doc_ids:
        insights.append({
            "type":       "risk",
            "title":      f"{len(high_risk_doc_ids)} high-risk document{'s' if len(high_risk_doc_ids) != 1 else ''}",
            "message":    "These documents contain potential issues requiring human review.",
            "count":      len(high_risk_doc_ids),
            "severity":   "HIGH",
            "action_url": "/documents",
        })

    # 3 — Processing failures
    failed = docs.filter(status="FAILED").count()
    if failed > 0:
        insights.append({
            "type":       "error",
            "title":      f"{failed} document{'s' if failed != 1 else ''} failed processing",
            "message":    "These documents could not be processed. You can retry them from the document page.",
            "count":      failed,
            "severity":   "MEDIUM",
            "action_url": "/documents",
        })

    # 4 — Unprocessed uploads
    unprocessed = docs.filter(status__in=["UPLOADED", "PROCESSING"]).count()
    if unprocessed > 0:
        insights.append({
            "type":       "processing",
            "title":      f"{unprocessed} document{'s' if unprocessed != 1 else ''} processing",
            "message":    "AI is currently analyzing your documents.",
            "count":      unprocessed,
            "severity":   "LOW",
            "action_url": "/documents",
        })

    return insights


def get_recent_documents(user, limit: int = 5) -> list:
    """Return the most recently uploaded authorized documents."""
    from documents.models import Document

    role = getattr(user, "role", "EMPLOYEE")
    docs = _authorized_docs(user, role).order_by("-created_at")[:limit]

    return [
        {
            "id":            d.id,
            "title":         d.title,
            "document_type": d.document_type,
            "status":        d.status,
            "created_at":    d.created_at.isoformat(),
        }
        for d in docs
    ]


def get_analytics(user) -> dict:
    """
    Return analytics data for charts/graphs.

    Returns:
        {
            documents_by_type,      # [{ type, count }]
            documents_by_status,    # [{ status, count }]
            risk_distribution,      # [{ severity, count }]
            uploads_last_7_days,    # [{ date, count }]
        }
    """
    from documents.models import Document
    from workflows.models import DocumentRisk

    role = getattr(user, "role", "EMPLOYEE")
    docs = _authorized_docs(user, role)

    # By type
    by_type = list(
        docs.values("document_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # By status
    by_status = list(
        docs.values("status")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # Risk distribution
    risk_dist = list(
        DocumentRisk.objects.filter(document__in=docs)
        .values("severity")
        .annotate(count=Count("id"))
        .order_by("severity")
    )

    # Uploads per day — last 7 days
    today    = timezone.now().date()
    days     = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    uploads_7 = []
    for day in days:
        start = timezone.datetime.combine(day, timezone.datetime.min.time()).replace(
            tzinfo=timezone.utc
        )
        end = start + timedelta(days=1)
        uploads_7.append({
            "date":  day.isoformat(),
            "count": docs.filter(created_at__gte=start, created_at__lt=end).count(),
        })

    return {
        "documents_by_type":   [{"type": r["document_type"], "count": r["count"]} for r in by_type],
        "documents_by_status": [{"status": r["status"],        "count": r["count"]} for r in by_status],
        "risk_distribution":   [{"severity": r["severity"],    "count": r["count"]} for r in risk_dist],
        "uploads_last_7_days": uploads_7,
    }


# ── Internal helper ───────────────────────────────────────────────────────────

def _authorized_docs(user, role):
    from documents.models import Document
    from workflows.models import DocumentPermission
    from django.db.models import Q

    if role == "ADMIN":
        return Document.objects.all()

    shared_ids = DocumentPermission.objects.filter(
        can_view=True,
    ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)

    return Document.objects.filter(
        Q(uploaded_by=user) | Q(id__in=shared_ids)
    ).distinct()
