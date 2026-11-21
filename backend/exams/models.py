"""
Government Exam Preparation models.
Official notification metadata is stored separately from AI-generated content.
"""
from django.conf import settings
from django.db import models


class ExamCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)  # SSC, Banking, Railway, UPSC, etc.
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True)

    def __str__(self): return self.name


class Exam(models.Model):
    category      = models.ForeignKey(ExamCategory, on_delete=models.CASCADE, related_name="exams")
    name          = models.CharField(max_length=255)
    short_name    = models.CharField(max_length=50, blank=True)
    description   = models.TextField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self): return self.name


class ExamSource(models.Model):
    """Official notification — source of truth for eligibility/dates/fees."""
    exam           = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="sources")
    title          = models.CharField(max_length=255)
    publication_date = models.DateField(null=True, blank=True)
    source_url     = models.URLField(blank=True)
    raw_text       = models.TextField(blank=True, help_text="Pasted notification text")
    vacancies      = models.IntegerField(null=True, blank=True)
    age_min        = models.IntegerField(null=True, blank=True)
    age_max        = models.IntegerField(null=True, blank=True)
    last_date      = models.DateField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.exam.name} — {self.title}"


class ExamSyllabus(models.Model):
    exam    = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="syllabus_topics")
    subject = models.CharField(max_length=100)
    topics  = models.JSONField(default=list)
    order   = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]


class ExamTopic(models.Model):
    syllabus    = models.ForeignKey(ExamSyllabus, on_delete=models.CASCADE, related_name="topic_items")
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self): return self.name


class Question(models.Model):
    TYPES = [("MCQ", "Multiple Choice"), ("SHORT", "Short Answer"), ("LONG", "Long Answer")]

    exam        = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="questions")
    topic       = models.ForeignKey(ExamTopic, on_delete=models.SET_NULL, null=True, blank=True)
    subject     = models.CharField(max_length=100, blank=True)
    question    = models.TextField()
    options     = models.JSONField(default=list, help_text="[{key,text}] for MCQ")
    answer      = models.CharField(max_length=10)
    explanation = models.TextField(blank=True)
    difficulty  = models.CharField(max_length=20, default="MEDIUM")
    year        = models.IntegerField(null=True, blank=True, help_text="PYQ year")
    is_pyq      = models.BooleanField(default=False, help_text="Previous Year Question")

    class Meta:
        ordering = ["subject", "difficulty"]


class MockTest(models.Model):
    exam       = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="mock_tests")
    title      = models.CharField(max_length=255)
    duration_minutes = models.IntegerField(default=60)
    total_marks = models.IntegerField(default=100)
    questions  = models.ManyToManyField(Question, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.exam.name} — {self.title}"


class MockAttempt(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mock_attempts")
    mock_test  = models.ForeignKey(MockTest, on_delete=models.CASCADE)
    answers    = models.JSONField(default=dict, help_text="{question_id: answer}")
    score      = models.FloatField(default=0)
    total      = models.IntegerField(default=0)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class StudyPlan(models.Model):
    user  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_plans")
    exam  = models.ForeignKey(Exam, on_delete=models.CASCADE)
    title = models.CharField(max_length=255, default="My Study Plan")
    plan  = models.JSONField(default=list, help_text="[{week, topic, description}]")
    created_at = models.DateTimeField(auto_now_add=True)


class StudyProgress(models.Model):
    user              = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_progress")
    exam              = models.ForeignKey(Exam, on_delete=models.CASCADE)
    questions_attempted = models.IntegerField(default=0)
    questions_correct   = models.IntegerField(default=0)
    mock_tests_taken    = models.IntegerField(default=0)
    weak_topics         = models.JSONField(default=list)
    study_streak        = models.IntegerField(default=0)
    last_activity       = models.DateField(null=True, blank=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "exam")]

    @property
    def accuracy(self) -> float:
        if self.questions_attempted == 0:
            return 0.0
        return round(self.questions_correct / self.questions_attempted * 100, 1)
