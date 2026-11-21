"""Extract and categorize skills from resume text."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Extract all skills from this resume and categorize them.
Return ONLY this JSON:
{{
  "all_skills": ["skill1", "skill2", ...],
  "categorized": {{
    "languages":    [],
    "frontend":     [],
    "backend":      [],
    "databases":    [],
    "tools":        [],
    "cloud":        [],
    "testing":      [],
    "other":        []
  }}
}}

RESUME TEXT:
{text}"""


def extract_skills(text: str) -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key or not text.strip():
        return {"all_skills": [], "categorized": {}}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.0,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(text=text[:6000])}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("skill_extractor error: %s", exc)
        return {"all_skills": [], "categorized": {}}
