"""Check for potential overclaims — skills listed but not demonstrated in projects."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Review this resume for potential overclaims.
A claim is potentially overclaimed if a skill is listed but there is no project or experience that demonstrates it.

RESUME TEXT:
{text}

Return ONLY this JSON:
{{
  "well_supported_skills": ["skill demonstrated in projects/experience"],
  "review_needed": [
    {{
      "skill": "skill name",
      "reason": "Listed in skills but not demonstrated in any project or experience section.",
      "suggestion": "Either add a project using this skill, or review if you should keep it."
    }}
  ],
  "summary": "1-2 sentence overview"
}}"""


def check_claims(resume_text: str) -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key or not resume_text.strip():
        return {"well_supported_skills": [], "review_needed": [], "summary": ""}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(text=resume_text[:6000])}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("resume_claim_checker error: %s", exc)
        return {"well_supported_skills": [], "review_needed": [], "summary": ""}
