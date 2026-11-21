"""Extract text from uploaded resume files (PDF/DOCX)."""
import logging
logger = logging.getLogger(__name__)


def parse_resume(resume) -> str:
    """Extract plain text from a Resume model instance's file."""
    path = resume.file.path
    ext  = path.rsplit(".", 1)[-1].lower()

    try:
        if ext == "pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(path)
            return "\n".join(page.get_text() for page in doc).strip()
        elif ext == "docx":
            import docx
            d = docx.Document(path)
            return "\n".join(p.text for p in d.paragraphs if p.text.strip()).strip()
        else:
            return ""
    except Exception as exc:
        logger.error("resume_parser failed for %s: %s", path, exc)
        return ""
