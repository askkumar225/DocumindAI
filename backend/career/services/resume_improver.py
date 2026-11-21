"""Improve specific resume sections — user must accept/reject changes."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Improve the '{section}' section of this resume.
Target role: {role}

Current content:
{content}

Return ONLY this JSON:
{{
  "section":     "{section}",
  "original":    "the original text",
  "improved":    "improved version",
  "explanation": "why this is better",
  "changes":     ["specific change 1", "change 2"]
}}

Rules:
- Do NOT invent experience, skills, or qualifications.
- Only rephrase and strengthen existing content.
- Use action verbs and measurable language where possible."""


def improve_section(section: str, content: str, target_role: str = "") -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return {"section": section, "original": content, "improved": content,
                "explanation": "AI not configured.", "changes": []}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(
                section=section, content=content[:3000], role=target_role or "general"
            )}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("resume_improver error: %s", exc)
        return {"section": section, "original": content, "improved": content,
                "explanation": "Error generating improvement.", "changes": []}
