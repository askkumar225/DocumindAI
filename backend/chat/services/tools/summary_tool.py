"""
Summary Tool — return structured summary from deep analysis or AI analysis.
Falls back to generating a new LLM summary if neither is available.
"""
import logging
logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Return a structured summary for a document.

    parameters:
        document_id — required

    Returns:
        { "summary": str, "key_points": [...], "document_title": str, "document_id": int }
    """
    document_id = parameters.get("document_id")
    if not document_id:
        return {"error": "No document specified. Please select a document first."}

    doc, error = _get_authorized_doc(user, document_id)
    if error:
        return {"error": error}

    # Prefer deep analysis summary
    try:
        deep = doc.deep_analysis
        if deep.status == "COMPLETED" and deep.summary:
            key_points = []
            for item in (deep.key_information or [])[:5]:
                key_points.append(f"{item.get('label', '')}: {item.get('value', '')}")
            return {
                "summary":        deep.summary,
                "key_points":     key_points,
                "document_title": doc.title,
                "document_id":    doc.id,
                "overall_risk":   deep.overall_risk_level,
                "confidence":     deep.confidence_score,
            }
    except Exception:
        pass

    # Fall back to AIAnalysis summary
    try:
        ai = doc.ai_analysis
        if ai and ai.ai_status == "COMPLETED" and ai.summary:
            fields = ai.extracted_data or {}
            key_points = [f"{k.replace('_',' ').title()}: {v}"
                          for k, v in list(fields.items())[:5] if v]
            return {
                "summary":        ai.summary,
                "key_points":     key_points,
                "document_title": doc.title,
                "document_id":    doc.id,
                "overall_risk":   None,
                "confidence":     ai.confidence,
            }
    except Exception:
        pass

    return {
        "error": (
            f"Summary not available yet for '{doc.title}'. "
            "The document may still be processing."
        )
    }


def _get_authorized_doc(user, document_id):
    from documents.models import Document
    from django.db.models import Q
    from workflows.models import DocumentPermission

    role = getattr(user, "role", "")
    try:
        if role == "ADMIN":
            doc = Document.objects.get(id=document_id)
        else:
            shared_ids = DocumentPermission.objects.filter(
                can_view=True
            ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)
            doc = Document.objects.get(
                Q(id=document_id),
                Q(uploaded_by=user) | Q(id__in=shared_ids)
            )
        return doc, None
    except Document.DoesNotExist:
        return None, "Document not found or you don't have permission to access it."
