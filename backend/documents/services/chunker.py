"""
Document chunking service.

Splits large extracted text into overlapping chunks suitable for
embedding and semantic search.

Page-boundary detection (in priority order):
    1. PDF form-feed characters (\f) inserted by PyMuPDF between pages.
    2. [Page N] markers written by our extractor for DOCX / OCR output.
    3. No page info → page_number=None (not invented).

Overlap:
    Without overlap a sentence that spans two chunk boundaries loses
    its context in one of them. Overlapping preserves continuity.

Configuration (from Django settings):
    CHUNK_SIZE    — target char count per chunk (default 1000)
    CHUNK_OVERLAP — overlap char count between consecutive chunks (default 150)
"""

import re
import logging
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Data type ────────────────────────────────────────────────────────────────

@dataclass
class Chunk:
    """A single text chunk ready for embedding."""
    content:     str
    chunk_index: int
    page_number: int | None
    char_count:  int


# ─── Page-boundary helpers ────────────────────────────────────────────────────

# Matches markers written by our extractor: [Page 1], [Page 12], etc.
_PAGE_MARKER_RE = re.compile(r"\[Page\s+(\d+)\]", re.IGNORECASE)


def _build_page_map(text: str) -> dict[int, int]:
    """
    Build {char_offset: page_number} from two sources:
        a) PyMuPDF form-feed chars (\f) — 1-based, increment on each \f
        b) [Page N] markers written by our extractor for DOCX / OCR

    When both sources exist the form-feed map wins because it comes
    directly from PDF page data. [Page N] markers are used as a fallback.

    Returns an empty dict when no page information is found — in that
    case callers should use page_number=None rather than inventing one.
    """
    page_map: dict[int, int] = {}

    # ── Form-feed scan (PDF) ──────────────────────────────────────────────────
    ff_map: dict[int, int] = {}
    page_num = 1
    ff_map[0] = 1
    for i, ch in enumerate(text):
        if ch == "\f":
            page_num += 1
            ff_map[i + 1] = page_num   # text after \f belongs to next page

    has_formfeed = page_num > 1        # True when at least one \f was found

    # ── [Page N] marker scan (DOCX / OCR) ────────────────────────────────────
    marker_map: dict[int, int] = {}
    for m in _PAGE_MARKER_RE.finditer(text):
        marker_map[m.start()] = int(m.group(1))

    if has_formfeed:
        return ff_map
    if marker_map:
        return marker_map
    return {}   # no page info at all


def _page_at_offset(offset: int, page_map: dict[int, int]) -> int | None:
    """
    Return the page number for a given character offset, or None if unknown.
    """
    if not page_map:
        return None
    page = None
    for pos, pnum in sorted(page_map.items()):
        if pos <= offset:
            page = pnum
        else:
            break
    return page


# ─── Sentence splitter ────────────────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """
    Split text into sentence-like units using punctuation + paragraph breaks.

    Not a full NLP tokeniser but robust enough for enterprise document chunking.
    [Page N] markers are preserved as their own sentence-like units so that
    the page offset scanner still sees them in the right position.
    """
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]


# ─── Public entry point ────────────────────────────────────────────────────────

def create_chunks(text: str) -> list[Chunk]:
    """
    Split extracted document text into overlapping chunks.

    Args:
        text: Full extracted text from ExtractedContent.text.

    Returns:
        List of Chunk objects, each with content, index, page_number, char_count.
        page_number is None when no page information is available — it is never
        invented.

    Algorithm:
        Walk the text using a sliding-window over sentences.
        Each window accumulates sentences until CHUNK_SIZE chars is reached.
        The next window starts at (cursor + CHUNK_SIZE - CHUNK_OVERLAP) so
        that consecutive chunks share CHUNK_OVERLAP chars of context.
    """
    chunk_size:    int = getattr(settings, "CHUNK_SIZE",    1000)
    chunk_overlap: int = getattr(settings, "CHUNK_OVERLAP", 150)

    if not text.strip():
        return []

    # Build the char→page map before cleaning so offsets are accurate
    page_map = _build_page_map(text)

    # Remove form-feed control chars from the working copy
    clean = text.replace("\f", "\n")

    sentences = _split_sentences(clean)
    if not sentences:
        return []

    # Re-derive character offsets for each sentence in the cleaned text
    sentence_offsets: list[tuple[int, str]] = []
    pos = 0
    for s in sentences:
        idx = clean.find(s, pos)
        if idx == -1:
            idx = pos
        sentence_offsets.append((idx, s))
        pos = idx + len(s)

    chunks: list[Chunk] = []
    chunk_index = 0
    sent_i = 0

    while sent_i < len(sentence_offsets):
        start_offset, _ = sentence_offsets[sent_i]
        window: list[str] = []
        window_chars = 0

        j = sent_i
        while j < len(sentence_offsets):
            _, s = sentence_offsets[j]
            # Skip bare [Page N] marker sentences — they carry no content
            if _PAGE_MARKER_RE.fullmatch(s.strip()):
                j += 1
                continue
            if window_chars + len(s) > chunk_size and window:
                break
            window.append(s)
            window_chars += len(s) + 1   # +1 for joining space
            j += 1

        content = " ".join(window).strip()
        if not content:
            sent_i += 1
            continue

        page = _page_at_offset(start_offset, page_map)

        chunks.append(Chunk(
            content=content,
            chunk_index=chunk_index,
            page_number=page,
            char_count=len(content),
        ))
        chunk_index += 1

        # Advance by (chunk_size - overlap) worth of sentences
        overlap_remaining = chunk_size - chunk_overlap
        consumed = 0
        sent_i_next = sent_i
        while sent_i_next < j:
            consumed += len(sentence_offsets[sent_i_next][1]) + 1
            sent_i_next += 1
            if consumed >= overlap_remaining:
                break

        sent_i = max(sent_i + 1, sent_i_next)

    logger.info(
        "Chunked document into %d chunks (size=%d, overlap=%d, page_info=%s)",
        len(chunks), chunk_size, chunk_overlap,
        "yes" if page_map else "no",
    )
    return chunks
