"""Match a resume against a job description."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Match this resume against this job description.

JOB DESCRIPTION:
{jd}

RESUME TEXT:
{resume}

Return ONLY this JSON:
{{
  "matched_skills":  ["skill"],
  "missing_skills":  ["skill"],
  "keywords":        ["important JD keyword"],
  "recommendations": ["specific suggestion to tailor resume"],
  "match_summary":   "2-3 sentence honest match summary",
  "tailored_suggestions": [
    {{"section": "string", "original": "string or null", "suggested": "string", "reason": "string"}}
  ]
}}
Do not invent experience. Only suggest rewording of existing content."""


def match_resume_to_job(resume_text: str, jd_text: str) -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return {"matched_skills": [], "missing_skills": [], "keywords": [],
                "recommendations": [], "match_summary": "", "tailored_suggestions": []}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(
                jd=jd_text[:4000], resume=resume_text[:4000]
            )}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("job_match error: %s", exc)
        return {"matched_skills": [], "missing_skills": [], "keywords": [],
                "recommendations": [], "match_summary": "", "tailored_suggestions": []}
