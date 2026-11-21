"""
Text preprocessing / cleaning service.

Cleans raw extracted text before sending it to the LLM.

Why:
    - PDF/OCR extraction produces trailing spaces, repeated blank lines,
      garbage characters, and inconsistent line endings.
    - Sending noisy text to the LLM wastes tokens and reduces accuracy.

Usage:
    from documents.services.cleaner import clean_text

    cleaned = clean_text(raw_text)
"""

import re


def clean_text(text: str) -> str:
    """
    Normalize extracted document text for LLM input.

    Steps:
        1. Normalize Windows line endings → Unix
        2. Strip leading/trailing whitespace from each line
        3. Remove lines that are pure noise (only punctuation/symbols)
        4. Collapse runs of 3+ blank lines into a single blank line
        5. Strip leading/trailing whitespace from the full result

    Args:
        text: Raw text from PDF/DOCX/OCR extraction.

    Returns:
        Cleaned, normalized text string.
    """
    if not text:
        return ""

    # 1. Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    lines = text.splitlines()
    cleaned_lines: list[str] = []

    for line in lines:
        line = line.strip()

        # 2. Skip lines that are only separator characters
        if re.fullmatch(r"[-=_*#~.]{3,}", line):
            continue

        # 3. Skip lines that are only numbers or single characters (page numbers etc.)
        if re.fullmatch(r"\d{1,4}", line):
            continue

        cleaned_lines.append(line)

    # 4. Collapse consecutive blank lines (>2) into one blank line
    result_lines: list[str] = []
    blank_count = 0

    for line in cleaned_lines:
        if line == "":
            blank_count += 1
            if blank_count <= 1:
                result_lines.append(line)
        else:
            blank_count = 0
            result_lines.append(line)

    return "\n".join(result_lines).strip()


def truncate_for_llm(text: str, max_chars: int) -> str:
    """
    Truncate text to max_chars for LLM token safety.

    Tries to cut at a paragraph boundary rather than mid-word.

    Args:
        text:      Cleaned document text.
        max_chars: Maximum character count (from settings.AI_MAX_INPUT_CHARS).

    Returns:
        Truncated text with a note appended if truncation occurred.
    """
    if len(text) <= max_chars:
        return text

    truncated = text[:max_chars]

    # Try to cut at the last paragraph break
    last_para = truncated.rfind("\n\n")
    if last_para > max_chars * 0.8:
        truncated = truncated[:last_para]

    return truncated + "\n\n[Document truncated for AI processing]"
