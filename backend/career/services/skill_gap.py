"""Skill gap analysis between resume skills and a target role."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Compare the resume skills against the target role requirements.
Target Role: {role}
Resume Skills: {skills}

Return ONLY this JSON:
{{
  "have":     ["skill you already have"],
  "missing":  ["skill you need to develop"],
  "recommended_topics": [
    {{"topic": "string", "why": "string", "priority": "HIGH|MEDIUM|LOW"}}
  ],
  "learning_roadmap": [
    {{"week": 1, "topic": "string", "description": "string"}}
  ],
  "match_summary": "2 sentence honest summary"
}}"""


def analyze_skill_gap(skills: list, target_role: str) -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return {"have": skills, "missing": [], "recommended_topics": [], "learning_roadmap": [], "match_summary": ""}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(
                role=target_role, skills=", ".join(skills)
            )}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("skill_gap error: %s", exc)
        return {"have": [], "missing": [], "recommended_topics": [], "learning_roadmap": [], "match_summary": ""}
