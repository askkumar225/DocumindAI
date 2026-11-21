"""
Resume analysis service — identifies sections, issues, suggestions, ATS score.
"""
import json, logging
from django.conf import settings

logger = logging.getLogger(__name__)

_SYSTEM = """You are an expert resume reviewer and career coach.
Analyze the resume text and return ONLY valid JSON.
Be honest but constructive. Use 'Potential Issue' and 'Suggestion' language, never harsh conclusions."""

_PROMPT = """Analyze this resume and return this exact JSON:
{{
  "summary": "2-3 sentence plain summary of the resume",
  "sections": {{
    "contact":      "Strong|Good|Needs Improvement|Missing",
    "objective":    "Strong|Good|Needs Improvement|Missing",
    "education":    "Strong|Good|Needs Improvement|Missing",
    "skills":       "Strong|Good|Needs Improvement|Missing",
    "projects":     "Strong|Good|Needs Improvement|Missing",
    "experience":   "Strong|Good|Needs Improvement|Missing",
    "certifications":"Strong|Good|Needs Improvement|Missing",
    "achievements": "Strong|Good|Needs Improvement|Missing"
  }},
  "issues": [
    {{"issue": "string", "severity": "HIGH|MEDIUM|LOW", "section": "string"}}
  ],
  "suggestions": [
    {{"suggestion": "string", "section": "string", "example": "string or null"}}
  ],
  "ats_score": 0_to_100,
  "target_roles": ["suggested role 1", "suggested role 2"]
}}

RESUME TEXT:
{text}"""


def analyze_resume(text: str) -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key or not text.strip():
        return _empty()
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user",   "content": _PROMPT.format(text=text[:8000])},
            ],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("resume_analyzer error: %s", exc)
        return _empty()


def _empty():
    return {
        "summary": "", "sections": {}, "issues": [],
        "suggestions": [], "ats_score": 0, "target_roles": [],
    }
