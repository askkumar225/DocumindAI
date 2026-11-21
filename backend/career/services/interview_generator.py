"""Generate interview questions from resume + job description."""
import json, logging
from django.conf import settings
logger = logging.getLogger(__name__)

_PROMPT = """Generate {count} interview questions for this candidate.

Interview Type: {interview_type}
Difficulty: {difficulty}
Target Role: {role}

Resume:
{resume}

Job Description:
{jd}

Return ONLY a JSON array:
[
  {{
    "question":    "the interview question",
    "category":    "Technical|HR|Project|Behavioral|Situational",
    "difficulty":  "Beginner|Intermediate|Advanced",
    "why_asked":   "Why interviewers ask this (1 sentence)",
    "answer_guide":"What the answer should contain (2-3 bullet points)"
  }}
]

Rules:
- Base questions on what the candidate actually claims in the resume.
- For project questions, ask about technologies and decisions used in listed projects.
- Mix technical depth for MIXED difficulty.
- Make questions specific, not generic."""


def generate_questions(
    resume_text: str,
    jd_text: str,
    interview_type: str,
    difficulty: str,
    count: int,
    target_role: str = "",
) -> list:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return _fallback(count)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": json.dumps(
                {"request": _PROMPT.format(
                    count=count, interview_type=interview_type,
                    difficulty=difficulty, role=target_role or "Software Developer",
                    resume=resume_text[:4000], jd=jd_text[:2000] if jd_text else "Not provided"
                )}
            )}],
        )
        raw = json.loads(res.choices[0].message.content or "[]")
        # Handle both array and {"questions": [...]}
        if isinstance(raw, list):
            return raw[:count]
        for key in ("questions", "items", "data"):
            if key in raw and isinstance(raw[key], list):
                return raw[key][:count]
        return _fallback(count)
    except Exception as exc:
        logger.error("interview_generator error: %s", exc)
        return _fallback(count)


def _fallback(count: int) -> list:
    defaults = [
        {"question": "Tell me about yourself.", "category": "HR", "difficulty": "Beginner",
         "why_asked": "Opener to understand your background.", "answer_guide": "Cover education, skills, and motivation."},
        {"question": "What is your main technical skill?", "category": "Technical", "difficulty": "Beginner",
         "why_asked": "To understand your core competency.", "answer_guide": "Name the skill, explain usage, give example."},
        {"question": "Explain one of your projects.", "category": "Project", "difficulty": "Intermediate",
         "why_asked": "To see how you apply skills.", "answer_guide": "Problem, tech used, your role, outcome."},
        {"question": "Why do you want this role?", "category": "HR", "difficulty": "Beginner",
         "why_asked": "Tests motivation and research.", "answer_guide": "Connect your skills to role requirements."},
        {"question": "What is your biggest technical challenge?", "category": "Behavioral", "difficulty": "Intermediate",
         "why_asked": "To see problem-solving ability.", "answer_guide": "Situation, action, learning."},
    ]
    return defaults[:min(count, len(defaults))]
