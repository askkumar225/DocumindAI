"""
OCR service using Tesseract + Pillow.

Handles:
    - Direct image files (.jpg, .png, .tiff, etc.)
    - Scanned PDFs (convert pages to images → OCR each page)

Requirements:
    pip install pytesseract Pillow pymupdf

    Tesseract must be installed separately on Windows:
    https://github.com/UB-Mannheim/tesseract/wiki

    After installation, set the path if needed:
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
"""

import logging

import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

# ── Windows Tesseract path (update if your install location differs) ──────────
# Uncomment and adjust the line below if Tesseract is not on your system PATH:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_image_text(image_path: str) -> str:
    """
    Extract text from an image file using Tesseract OCR.

    Args:
        image_path: Absolute path to the image file.

    Returns:
        Extracted text string. Empty string on failure.
    """
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        logger.info(
            "OCR extracted %d characters from '%s'",
            len(text),
            image_path,
        )
        return text.strip()
    except Exception as exc:
        logger.error("OCR failed for '%s': %s", image_path, exc)
        return ""


def pdf_to_images_and_ocr(pdf_path: str) -> str:
    """
    Convert each page of a scanned PDF to an image, then OCR it.

    Uses PyMuPDF to render pages at 300 DPI (good for OCR accuracy),
    then passes each rendered image to Tesseract.

    Args:
        pdf_path: Absolute path to the PDF file.

    Returns:
        Combined OCR text from all pages.
    """
    import fitz  # PyMuPDF — imported here to keep ocr.py lightweight

    try:
        document = fitz.open(pdf_path)
        page_texts: list[str] = []

        for page_number, page in enumerate(document, start=1):
            # Render at 300 DPI — matrix(zoom, zoom) where zoom = dpi / 72
            zoom = 300 / 72
            matrix = fitz.Matrix(zoom, zoom)
            pixmap = page.get_pixmap(matrix=matrix)

            # Convert PyMuPDF pixmap → Pillow Image (no temp file needed)
            pil_image = Image.frombytes(
                "RGB",
                [pixmap.width, pixmap.height],
                pixmap.samples,
            )

            page_text = pytesseract.image_to_string(pil_image)
            page_texts.append(page_text)

            logger.debug(
                "OCR page %d/%d: %d chars",
                page_number,
                len(document),
                len(page_text),
            )

        combined = "\n".join(page_texts).strip()
        logger.info(
            "PDF OCR complete for '%s': %d total chars across %d pages",
            pdf_path,
            len(combined),
            len(document),
        )
        return combined

    except Exception as exc:
        logger.error("PDF OCR failed for '%s': %s", pdf_path, exc)
        return ""
