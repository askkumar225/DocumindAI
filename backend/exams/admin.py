"""
Django admin for the Government Exam Preparation module.
"""
from django.contrib import admin

from .models import (
    ExamCategory, Exam, ExamSource, ExamSyllabus, ExamTopic,
    Question, MockTest, MockAttempt, StudyPlan, StudyProgress,
)


@admin.register(ExamCategory)
class ExamCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["name", "short_name", "category", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "short_name"]


@admin.register(ExamSource)
class ExamSourceAdmin(admin.ModelAdmin):
    list_display = ["exam", "title", "publication_date", "vacancies"]
    list_filter = ["exam__category"]
    search_fields = ["title", "exam__name"]


@admin.register(ExamSyllabus)
class ExamSyllabusAdmin(admin.ModelAdmin):
    list_display = ["exam", "subject", "order"]
    list_filter = ["exam"]


@admin.register(ExamTopic)
class ExamTopicAdmin(admin.ModelAdmin):
    list_display = ["name", "syllabus"]
    search_fields = ["name"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["exam", "subject", "difficulty", "is_pyq", "year"]
    list_filter = ["exam", "subject", "difficulty", "is_pyq"]
    search_fields = ["question"]


@admin.register(MockTest)
class MockTestAdmin(admin.ModelAdmin):
    list_display = ["title", "exam", "duration_minutes", "total_marks"]
    list_filter = ["exam"]
    filter_horizontal = ["questions"]


@admin.register(MockAttempt)
class MockAttemptAdmin(admin.ModelAdmin):
    list_display = ["user", "mock_test", "score", "is_complete", "created_at"]
    list_filter = ["is_complete", "mock_test__exam"]
    search_fields = ["user__username"]


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ["user", "exam", "title", "created_at"]
    list_filter = ["exam"]
    search_fields = ["user__username", "title"]


@admin.register(StudyProgress)
class StudyProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "exam", "questions_attempted", "questions_correct",
                    "mock_tests_taken", "study_streak"]
    list_filter = ["exam"]
    search_fields = ["user__username"]
