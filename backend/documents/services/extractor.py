"""
Document text extraction service.

Supports:
    .pdf   → PyMuPDF (digital PDF) — method: PDF_TEXT
             Falls back to OCR if no selectable text — method: OCR
    .docx  → python-docx — method: DOCX_TEXT
    .jpg / .jpeg / .png / .tiff / .bmp / .gif → Tesseract OCR — method: OCR

Returns:
    tuple[str, int, str]  →  (extracted_text, page_count, extraction_method)

Extraction method values: PDF_TEXT | DOCX_TEXT | OCR
"""

import logging
from pathlib import Path

import fitz  # PyMuPDF

from docx import Document as DocxDocument

from .ocr import extract_image_text, pdf_to_images_and_ocr

logger = logging.getLogger(__name__)

# Minimum characters to consider a PDF page as "having real text"
MIN_TEXT_THRESHOLD = 30

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".gif"}


# ─── PDF ──────────────────────────────────────────────────────────────────────

def extract_pdf_text(file_path: str) -> tuple[str, int, str]:
    """
    Extract text from a PDF using PyMuPDF.

    Falls back to OCR if insufficient selectable text is found
    (i.e. scanned / image-only PDF).

    Returns:
        (text, page_count, extraction_method)
        extraction_method: "PDF_TEXT" or "OCR"
    """
    document = fitz.open(file_path)
    page_count = len(document)
    pages: list[str] = []

    for page in document:
        pages.append(page.get_text())

    full_text = "\n".join(pages).strip()

    if len(full_text) < MIN_TEXT_THRESHOLD:
        logger.info(
            "PDF '%s' has minimal selectable text (%d chars) → falling back to OCR.",
            file_path,
            len(full_text),
        )
        ocr_text = pdf_to_images_and_ocr(file_path)
        return ocr_text, page_count, "OCR"

    return full_text, page_count, "PDF_TEXT"


# ─── DOCX ─────────────────────────────────────────────────────────────────────

def extract_docx_text(file_path: str) -> tuple[str, int, str]:
    """
    Extract text from a DOCX file using python-docx.

    Returns:
        (text, 0, "DOCX_TEXT")  — page count not available for DOCX
    """
    document = DocxDocument(file_path)
    parts: list[str] = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            parts.append(paragraph.text.strip())

    for table in document.tables:
        for row in table.rows:
            row_text = " | ".join(
                cell.text.strip()
                for cell in row.cells
                if cell.text.strip()
            )
            if row_text:
                parts.append(row_text)

    return "\n".join(parts), 0, "DOCX_TEXT"


# ─── Image ────────────────────────────────────────────────────────────────────

def extract_image_file_text(file_path: str) -> tuple[str, int, str]:
    """
    Extract text from an image file using Tesseract OCR.

    Returns:
        (text, 1, "OCR")
    """
    text = extract_image_text(file_path)
    return text, 1, "OCR"


# ─── Unified entry point ──────────────────────────────────────────────────────

def extract_text(file_path: str) -> tuple[str, int, str]:
    """
    Detect file type and dispatch to the correct extractor.

    Args:
        file_path: Absolute path to the uploaded file.

    Returns:
        (extracted_text, page_count, extraction_method)
        extraction_method: "PDF_TEXT" | "DOCX_TEXT" | "OCR"

    Raises:
        ValueError: If the file extension is not supported.
    """
    extension = Path(file_path).suffix.lower()
    logger.info("Extracting text from '%s' (ext: %s)", file_path, extension)

    if extension == ".pdf":
        return extract_pdf_text(file_path)

    if extension == ".docx":
        return extract_docx_text(file_path)

    if extension in IMAGE_EXTENSIONS:
        return extract_image_file_text(file_path)

    raise ValueError(
        f"Unsupported file type: '{extension}'. "
        f"Supported: .pdf, .docx, .jpg, .jpeg, .png, .tiff, .bmp, .gif"
    )
