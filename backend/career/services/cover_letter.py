"""Generate cover letters and professional emails."""
import logging
from django.conf import settings
logger = logging.getLogger(__name__)

_COVER_LETTER_PROMPT = """Write a professional cover letter.

Job Title: {job_title}
Company: {company}
Resume Summary: {resume_summary}
Key Matching Skills: {skills}

Rules:
- Use only information from the resume. Do not invent experience.
- 3 short paragraphs: intro, why you fit, call to action.
- Professional but natural tone.
- Under 250 words."""

_EMAIL_PROMPT = """Write a professional {email_type} email for a job application.
Job: {job_title} at {company}
Candidate Name: {name}
Keep it under 100 words, professional, and direct."""


def generate_cover_letter(resume_text: str, job_title: str, company: str, skills: list) -> str:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return f"Dear Hiring Team at {company},\n\nI am applying for the {job_title} position...\n\n[Configure LLM_API_KEY for AI-generated cover letter]"
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.5,
            max_tokens=400,
            messages=[{"role": "user", "content": _COVER_LETTER_PROMPT.format(
                job_title=job_title, company=company,
                resume_summary=resume_text[:2000],
                skills=", ".join(skills[:10]),
            )}],
        )
        return (res.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error("cover_letter error: %s", exc)
        return "Error generating cover letter."


def generate_email(email_type: str, job_title: str, company: str, name: str) -> str:
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return f"[Configure LLM_API_KEY to generate {email_type} email]"
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.4, max_tokens=200,
            messages=[{"role": "user", "content": _EMAIL_PROMPT.format(
                email_type=email_type, job_title=job_title, company=company, name=name
            )}],
        )
        return (res.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error("cover_letter email error: %s", exc)
        return "Error generating email."
