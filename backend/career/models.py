"""
Career AI models — Resume, Analysis, Skills, Jobs, Interviews, Applications.
"""
from django.conf import settings
from django.db import models


# ─── Resume ───────────────────────────────────────────────────────────────────

class Resume(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes"
    )
    title          = models.CharField(max_length=255, default="My Resume")
    file           = models.FileField(upload_to="resumes/")
    extracted_text = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} — {self.title}"


class ResumeAnalysis(models.Model):
    resume      = models.OneToOneField(Resume, on_delete=models.CASCADE, related_name="analysis")
    summary     = models.TextField(blank=True)
    skills      = models.JSONField(default=list)
    sections    = models.JSONField(default=dict)
    issues      = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    target_role = models.CharField(max_length=255, blank=True)
    ats_score   = models.IntegerField(default=0, help_text="0-100 ATS readiness")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis — {self.resume.title}"


class SkillProfile(models.Model):
    resume              = models.OneToOneField(Resume, on_delete=models.CASCADE, related_name="skill_profile")
    skills              = models.JSONField(default=list)
    missing_skills      = models.JSONField(default=list)
    recommended_topics  = models.JSONField(default=list)
    target_role         = models.CharField(max_length=255, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)


# ─── Job Matching ─────────────────────────────────────────────────────────────

class JobDescription(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_descriptions")
    title      = models.CharField(max_length=255)
    company    = models.CharField(max_length=255, blank=True)
    source_url = models.URLField(blank=True)
    raw_text   = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} @ {self.company}"


class JobMatch(models.Model):
    resume          = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="job_matches")
    job             = models.ForeignKey(JobDescription, on_delete=models.CASCADE, related_name="matches")
    matched_skills  = models.JSONField(default=list)
    missing_skills  = models.JSONField(default=list)
    keywords        = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)
    match_summary   = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)


class JobApplication(models.Model):
    class Status(models.TextChoices):
        SAVED     = "SAVED",     "Saved"
        APPLIED   = "APPLIED",   "Applied"
        TEST      = "TEST",      "Test"
        INTERVIEW = "INTERVIEW", "Interview"
        OFFER     = "OFFER",     "Offer"
        REJECTED  = "REJECTED",  "Rejected"

    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_applications")
    company     = models.CharField(max_length=255)
    job_title   = models.CharField(max_length=255)
    job_url     = models.URLField(blank=True)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.SAVED)
    notes       = models.TextField(blank=True)
    next_action = models.CharField(max_length=255, blank=True)
    applied_at  = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


# ─── Interview ────────────────────────────────────────────────────────────────

class InterviewSession(models.Model):
    TYPES = [
        ("QUICK",         "Quick Practice"),
        ("TECHNICAL",     "Technical Interview"),
        ("HR",            "HR Interview"),
        ("PROJECT",       "Project Interview"),
        ("RESUME_BASED",  "Resume-Based Interview"),
        ("FULL_MOCK",     "Full Mock Interview"),
    ]
    DIFFICULTIES = [
        ("BEGINNER",     "Beginner"),
        ("INTERMEDIATE", "Intermediate"),
        ("ADVANCED",     "Advanced"),
        ("MIXED",        "Mixed"),
    ]

    user                 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interview_sessions")
    resume               = models.ForeignKey(Resume, on_delete=models.SET_NULL, null=True, blank=True, related_name="interview_sessions")
    job                  = models.ForeignKey(JobDescription, on_delete=models.SET_NULL, null=True, blank=True)
    interview_type       = models.CharField(max_length=50, choices=TYPES, default="RESUME_BASED")
    difficulty           = models.CharField(max_length=30, choices=DIFFICULTIES, default="MIXED")
    total_questions      = models.PositiveIntegerField(default=10)
    completed_questions  = models.PositiveIntegerField(default=0)
    is_complete          = models.BooleanField(default=False)
    final_feedback       = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class InterviewQuestion(models.Model):
    session    = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name="questions")
    question   = models.TextField()
    category   = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(max_length=30, blank=True)
    order      = models.PositiveIntegerField(default=0)
    why_asked  = models.TextField(blank=True, help_text="Why interviewers ask this")
    answer_guide = models.TextField(blank=True, help_text="What the answer should contain")

    class Meta:
        ordering = ["order"]


class InterviewAnswer(models.Model):
    question           = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name="answer")
    answer_text        = models.TextField()
    feedback           = models.TextField(blank=True)
    strengths          = models.JSONField(default=list)
    improvement_areas  = models.JSONField(default=list)
    suggested_answer   = models.TextField(blank=True)
    simple_answer      = models.TextField(blank=True)
    professional_answer = models.TextField(blank=True)
    created_at         = models.DateTimeField(auto_now_add=True)
