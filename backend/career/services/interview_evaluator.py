"""Evaluate an interview answer and provide structured feedback."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Evaluate this interview answer.

Question: {question}
Candidate's Answer: {answer}
Category: {category}

Return ONLY this JSON:
{{
  "feedback": "2-3 sentence overall feedback (specific and actionable)",
  "strengths": ["specific strength 1", "strength 2"],
  "improvement_areas": ["specific improvement 1", "improvement 2"],
  "suggested_answer": "A good complete answer to this question",
  "simple_answer": "Same answer in very simple English",
  "professional_answer": "Same answer in professional interview English",
  "answer_structure": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}}

Rules:
- Be constructive, not harsh.
- Feedback must be specific to what was said.
- Do not say "bad communication". Say what to add or improve.
- suggested_answer should be 3-5 sentences max."""


def evaluate_answer(question: str, answer: str, category: str = "Technical") -> dict:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return _empty(answer)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": _PROMPT.format(
                question=question, answer=answer[:2000], category=category
            )}],
        )
        return json.loads(res.choices[0].message.content or "{}")
    except Exception as exc:
        logger.error("interview_evaluator error: %s", exc)
        return _empty(answer)


def _empty(answer: str) -> dict:
    return {
        "feedback": "Your answer has been recorded. Configure LLM_API_KEY for AI feedback.",
        "strengths": ["Answer submitted"],
        "improvement_areas": [],
        "suggested_answer": "",
        "simple_answer": "",
        "professional_answer": "",
        "answer_structure": [],
    }
