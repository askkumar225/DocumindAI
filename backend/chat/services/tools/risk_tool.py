"""
Risk Tool — find documents with AI-detected risks, filtered by severity.
"""
import logging
logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Find all authorized documents with risks at the given severity level.

    parameters:
        risk_level     — HIGH / MEDIUM / LOW / CRITICAL (default: HIGH)
        document_type  — optional filter

    Returns:
        { "risks": [...], "count": int, "risk_level": str }
    """
    from workflows.models import DocumentRisk
    from django.db.models import Q
    from workflows.models import DocumentPermission

    risk_level = parameters.get("risk_level", "HIGH")
    doc_type   = parameters.get("document_type")
    role       = getattr(user, "role", "")

    # Build authorized document IDs
    if role == "ADMIN":
        from documents.models import Document
        authorized_ids = set(Document.objects.values_list("id", flat=True))
    else:
        from documents.models import Document
        shared_ids = DocumentPermission.objects.filter(
            can_view=True,
        ).filter(
            Q(user=user) | Q(role=role)
        ).values_list("document_id", flat=True)
        authorized_ids = set(
            Document.objects.filter(
                Q(uploaded_by=user) | Q(id__in=shared_ids)
            ).values_list("id", flat=True)
        )

    # Query risks
    risk_qs = DocumentRisk.objects.filter(
        document_id__in=authorized_ids,
        severity=risk_level,
    ).select_related("document").order_by("-created_at")

    if doc_type:
        risk_qs = risk_qs.filter(document__document_type=doc_type)

    risk_qs = risk_qs[:30]

    # Group by document
    docs_seen: dict[int, dict] = {}
    for risk in risk_qs:
        did = risk.document_id
        if did not in docs_seen:
            docs_seen[did] = {
                "document_id":    did,
                "document_title": risk.document.title,
                "document_type":  risk.document.document_type,
                "document_status": risk.document.status,
                "risks": [],
            }
        docs_seen[did]["risks"].append({
            "title":       risk.title,
            "description": risk.description,
            "severity":    risk.severity,
            "source_text": risk.source_text[:200] if risk.source_text else "",
            "page":        risk.page_number,
        })

    result_list = list(docs_seen.values())

    return {
        "risks":      result_list,
        "count":      len(result_list),
        "risk_level": risk_level,
    }
