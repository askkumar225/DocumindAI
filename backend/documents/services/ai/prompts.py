"""
Prompt templates for DocuMind AI document analysis.

Design principles:
    - Each prompt requests JSON-only output (no markdown, no prose).
    - Missing fields must be returned as null — never fabricated.
    - System prompt establishes strict document intelligence role.
    - User prompts include the document text + expected output schema.
"""

import json

from .schemas import CLASSIFICATION_SCHEMA, get_schema

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are DocuMind AI, an expert document intelligence system.

Your role is to analyze enterprise documents and return structured JSON output.

Rules you must always follow:
1. Return ONLY valid JSON. No markdown, no code blocks, no explanations.
2. Never fabricate or infer values not present in the document.
   Use null for any field that cannot be found.
3. All dates must use ISO 8601 format: YYYY-MM-DD.
4. All monetary amounts must be plain numbers (not strings).
   Example: 84500 not "₹84,500".
5. Confidence must be a float between 0.0 and 1.0.
6. Your output must be parseable by Python json.loads()."""


# ─── Classification prompt ────────────────────────────────────────────────────

def build_classification_prompt(text: str) -> str:
    """
    Build the user prompt for document type classification.

    Returns a prompt that asks the LLM to classify the document
    and return a confidence score.
    """
    schema_str = json.dumps(CLASSIFICATION_SCHEMA, indent=2)

    return f"""Classify the following document.

Return a JSON object matching this exact schema:
{schema_str}

document_type must be one of:
INVOICE, CONTRACT, PURCHASE_ORDER, RECEIPT, REPORT, POLICY, OTHER

DOCUMENT TEXT:
{text}

Return only the JSON object. No other text."""


# ─── Extraction prompt ────────────────────────────────────────────────────────

def build_extraction_prompt(text: str, document_type: str) -> str:
    """
    Build the user prompt for structured field extraction.

    Selects the correct schema based on document_type and asks
    the LLM to extract all available fields.
    """
    schema = get_schema(document_type)
    schema_str = json.dumps(schema, indent=2)

    return f"""Extract structured data from this {document_type} document.

Return a JSON object matching this exact schema:
{schema_str}

Rules:
- Use null for any field not found in the document.
- Do not invent or estimate values.
- Dates must be YYYY-MM-DD format.
- Monetary amounts must be plain numbers.

DOCUMENT TEXT:
{text}

Return only the JSON object. No other text."""


# ─── Summary prompt ───────────────────────────────────────────────────────────

def build_summary_prompt(text: str, document_type: str) -> str:
    """
    Build the user prompt for generating a concise AI summary.

    The summary should be 2–4 sentences of plain English suitable
    for display to a business user.
    """
    return f"""Write a concise 2-4 sentence summary of this {document_type} document.

Focus on the most important business information: parties involved,
key amounts, dates, and any critical terms.

Write in plain English for a business user.
Do not include bullet points or headings — plain paragraphs only.

DOCUMENT TEXT:
{text}

Return only the summary text. No JSON, no labels."""
