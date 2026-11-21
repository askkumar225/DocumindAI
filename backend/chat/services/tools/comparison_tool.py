"""
Comparison Tool — create or retrieve a document comparison.
Resolves document names/IDs from conversation context and runs the comparator.
"""
import logging
logger = logging.getLogger(__name__)


def run(user, parameters: dict) -> dict:
    """
    Create a comparison between documents specified in parameters.

    parameters:
        document_ids  — list of int IDs  (preferred)
        document_type — optional: compare all docs of this type

    Returns:
        { "comparison_id": int, "status": str, "redirect": "/comparisons/{id}" }
    """
    from documents.models import Document, DocumentComparison, ComparisonDocument
    from documents.tasks import run_comparison_task
    from django.db.models import Q
    from workflows.models import DocumentPermission

    doc_ids  = parameters.get("document_ids", [])
    doc_type = parameters.get("document_type")
    role     = getattr(user, "role", "")

    # If no explicit IDs, try to find by type
    if not doc_ids and doc_type:
        if role == "ADMIN":
            qs = Document.objects.filter(document_type=doc_type)
        else:
            shared_ids = DocumentPermission.objects.filter(
                can_view=True
            ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)
            qs = Document.objects.filter(
                document_type=doc_type,
            ).filter(Q(uploaded_by=user) | Q(id__in=shared_ids))
        doc_ids = list(qs.values_list("id", flat=True)[:5])

    if len(doc_ids) < 2:
        return {
            "error": (
                "Please specify at least 2 documents to compare. "
                "You can select them from the sidebar or say "
                "'compare [Document A] and [Document B]'."
            )
        }

    # Permission check
    if role == "ADMIN":
        accessible = set(Document.objects.filter(id__in=doc_ids).values_list("id", flat=True))
    else:
        shared_ids = DocumentPermission.objects.filter(
            can_view=True
        ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)
        accessible = set(
            Document.objects.filter(id__in=doc_ids).filter(
                Q(uploaded_by=user) | Q(id__in=shared_ids)
            ).values_list("id", flat=True)
        )

    blocked = set(doc_ids) - accessible
    if blocked:
        return {"error": f"You don't have access to document IDs: {sorted(blocked)}."}

    # Create comparison
    titles = list(Document.objects.filter(id__in=doc_ids).values_list("title", flat=True))
    title  = " vs ".join(t.split(".")[0] for t in titles[:3])

    comparison = DocumentComparison.objects.create(
        created_by=user,
        title=title,
        status="PENDING",
    )
    for did in doc_ids:
        doc = Document.objects.get(id=did)
        ComparisonDocument.objects.create(
            comparison=comparison,
            document=doc,
            role_label=doc.document_type or "",
        )

    run_comparison_task.delay(comparison.id)

    return {
        "comparison_id": comparison.id,
        "status":        "PENDING",
        "title":         title,
        "redirect":      f"/comparisons/{comparison.id}",
        "doc_count":     len(doc_ids),
    }
