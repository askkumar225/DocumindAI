"""
Search Tool — find and filter documents by type, risk, status, amounts, dates.
All queries are permission-scoped before touching the database.
"""

import logging
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Search authorized documents with optional filters.

    Supported parameters:
        document_type  — CONTRACT / INVOICE / PURCHASE_ORDER / etc.
        risk_level     — HIGH / MEDIUM / LOW / CRITICAL
        status         — APPROVED / PENDING_APPROVAL / REJECTED / etc.
        amount_min     — minimum total_amount (from ai_analysis.extracted_data)
        amount_max     — maximum total_amount
        filter_type    — "amount" | "date" | "status"

    Returns:
        {
            "documents": [...],  # list of document dicts
            "count": int,
            "filter_summary": str
        }
    """
    from documents.models import Document
    from workflows.models import DocumentPermission

    role      = getattr(user, "role", "")
    user_role = role

    # ── Build base queryset (permission-scoped) ───────────────────────────────
    if role == "ADMIN":
        qs = Document.objects.select_related("ai_analysis").all()
    else:
        shared_ids = DocumentPermission.objects.filter(
            can_view=True,
        ).filter(
            Q(user=user) | Q(role=user_role)
        ).values_list("document_id", flat=True)

        qs = Document.objects.filter(
            Q(uploaded_by=user) | Q(id__in=shared_ids)
        ).select_related("ai_analysis").distinct()

    # ── Apply filters ──────────────────────────────────────────────────────────

    doc_type = parameters.get("document_type")
    if doc_type:
        qs = qs.filter(document_type=doc_type)

    status_filter = parameters.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    # Risk level — filter via DocumentRisk
    risk_level = parameters.get("risk_level")
    if risk_level:
        from workflows.models import DocumentRisk
        risky_ids = DocumentRisk.objects.filter(
            severity=risk_level
        ).values_list("document_id", flat=True)
        qs = qs.filter(id__in=risky_ids)

    # Amount filter — from ai_analysis.extracted_data
    amount_min = parameters.get("amount_min")
    amount_max = parameters.get("amount_max")

    # Limit results
    docs = list(qs.order_by("-created_at")[:20])

    # Post-filter by amount if needed (extracted_data is JSON)
    if amount_min is not None or amount_max is not None:
        filtered = []
        for doc in docs:
            try:
                val = _extract_amount(doc)
                if val is None:
                    continue
                if amount_min is not None and val < amount_min:
                    continue
                if amount_max is not None and val > amount_max:
                    continue
                filtered.append(doc)
            except Exception:
                pass
        docs = filtered

    # Build filter summary string
    parts = []
    if doc_type:    parts.append(doc_type.replace("_", " ").title())
    if risk_level:  parts.append(f"{risk_level} risk")
    if status_filter: parts.append(status_filter.replace("_", " "))
    if amount_min:  parts.append(f"above {amount_min:,.0f}")
    if amount_max:  parts.append(f"below {amount_max:,.0f}")
    filter_summary = " · ".join(parts) if parts else "all types"

    return {
        "documents": [_doc_to_dict(d) for d in docs],
        "count": len(docs),
        "filter_summary": filter_summary,
    }


def _extract_amount(doc) -> float | None:
    try:
        data = doc.ai_analysis.extracted_data or {}
        for key in ("total_amount", "contract_value", "subtotal"):
            val = data.get(key)
            if val is not None:
                return float(val)
    except Exception:
        pass
    return None


def _doc_to_dict(doc) -> dict:
    overall_risk = None
    try:
        from workflows.models import DocumentRisk
        risks = DocumentRisk.objects.filter(document=doc)
        order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        severities = list(risks.values_list("severity", flat=True))
        overall_risk = next((s for s in order if s in severities), None)
    except Exception:
        pass

    return {
        "id":            doc.id,
        "title":         doc.title,
        "document_type": doc.document_type,
        "status":        doc.status,
        "overall_risk":  overall_risk,
        "created_at":    doc.created_at.isoformat(),
        "amount":        _extract_amount(doc),
    }
