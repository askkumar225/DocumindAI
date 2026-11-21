"""
Extraction Tool — extract specific data fields from a document's deep analysis.
Supports: dates, amounts, entities, key_information, risks, missing_information.
"""
import logging
logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Extract structured data from a document's deep analysis.

    parameters:
        document_id    — required
        extract_type   — "dates" | "amounts" | "entities" | "risks" |
                         "missing" | "key_info" | "all"  (default: "all")

    Returns:
        { "items": [...], "extract_type": str, "document_title": str }
    """
    document_id  = parameters.get("document_id")
    extract_type = parameters.get("extract_type", "all")

    if not document_id:
        return {"error": "No document selected. Please specify which document to extract data from."}

    doc, error = _get_authorized_doc(user, document_id)
    if error:
        return {"error": error}

    # Try deep analysis first
    try:
        deep = doc.deep_analysis
        if deep.status == "COMPLETED":
            return _from_deep(doc, deep, extract_type)
    except Exception:
        pass

    # Fall back to AI analysis extracted_data
    try:
        ai = doc.ai_analysis
        if ai and ai.ai_status == "COMPLETED":
            return _from_ai(doc, ai, extract_type)
    except Exception:
        pass

    return {"error": f"No analysis data available for '{doc.title}' yet."}


def _from_deep(doc, deep, extract_type: str) -> dict:
    items = []
    label = extract_type

    if extract_type in ("dates", "all"):
        for d in (deep.important_dates or []):
            items.append({
                "type":        "date",
                "name":        d.get("name", ""),
                "value":       d.get("value", ""),
                "description": d.get("description", ""),
                "page":        d.get("page"),
            })

    if extract_type in ("amounts", "all"):
        for a in (deep.amounts or []):
            items.append({
                "type":        "amount",
                "name":        a.get("name", ""),
                "value":       a.get("value"),
                "currency":    a.get("currency", ""),
                "description": a.get("description", ""),
                "page":        a.get("page"),
            })

    if extract_type in ("entities", "all"):
        for e in (deep.entities or []):
            items.append({
                "type":    "entity",
                "name":    e.get("name", ""),
                "kind":    e.get("type", ""),
                "context": e.get("context", ""),
            })

    if extract_type in ("key_info", "all"):
        for k in (deep.key_information or []):
            items.append({
                "type":  "key_info",
                "label": k.get("label", ""),
                "value": k.get("value", ""),
                "page":  k.get("page"),
            })

    if extract_type in ("risks", "all"):
        for r in (deep.risks or []):
            items.append({
                "type":        "risk",
                "title":       r.get("title", ""),
                "severity":    r.get("severity", ""),
                "description": r.get("description", ""),
                "page":        r.get("page"),
            })

    if extract_type in ("missing", "all"):
        for m in (deep.missing_information or []):
            items.append({
                "type":        "missing",
                "issue":       m.get("issue", ""),
                "severity":    m.get("severity", ""),
                "description": m.get("description", ""),
            })

    return {
        "items":          items,
        "extract_type":   label,
        "document_title": doc.title,
        "document_id":    doc.id,
        "count":          len(items),
    }


def _from_ai(doc, ai, extract_type: str) -> dict:
    fields = ai.extracted_data or {}
    items = [
        {"type": "field", "label": k.replace("_", " ").title(), "value": str(v)}
        for k, v in fields.items() if v is not None
    ]
    return {
        "items":          items,
        "extract_type":   extract_type,
        "document_title": doc.title,
        "document_id":    doc.id,
        "count":          len(items),
    }


def _get_authorized_doc(user, document_id):
    from documents.models import Document
    from django.db.models import Q
    from workflows.models import DocumentPermission

    role = getattr(user, "role", "")
    try:
        if role == "ADMIN":
            return Document.objects.get(id=document_id), None
        shared_ids = DocumentPermission.objects.filter(
            can_view=True
        ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)
        doc = Document.objects.get(
            Q(id=document_id),
            Q(uploaded_by=user) | Q(id__in=shared_ids),
        )
        return doc, None
    except Document.DoesNotExist:
        return None, "Document not found or you don't have permission."
