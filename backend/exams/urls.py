"""
URL configuration for the Government Exam Preparation module.

Prefix: /api/exams/

    GET    /api/exams/                        — list categories with exams
    GET    /api/exams/categories/{slug}/      — exams in a category
    GET    /api/exams/{id}/                   — exam detail (sources + syllabus)
    GET    /api/exams/{id}/syllabus/           — syllabus topics
    GET    /api/exams/{id}/questions/         — list questions
    POST   /api/exams/{id}/practice/          — get/submit practice questions
    GET    /api/exams/{id}/mock-tests/        — list mock tests
    POST   /api/exams/{id}/mock-tests/        — start/submit mock test
    POST   /api/exams/{id}/study-plan/        — generate study plan
    GET    /api/exams/{id}/progress/          — study progress
"""

from django.urls import path

from .views import (
    ExamListView,
    ExamCategoryDetailView,
    ExamDetailView,
    ExamSyllabusView,
    ExamQuestionsView,
    ExamPracticeView,
    ExamMockTestView,
    ExamStudyPlanView,
    ExamProgressView,
)

urlpatterns = [
    # Categories & listings
    path("exams/",                            ExamListView.as_view(),              name="exam-list"),
    path("exams/categories/<slug:slug>/",    ExamCategoryDetailView.as_view(),   name="exam-category-detail"),

    # Single exam
    path("exams/<int:pk>/",                    ExamDetailView.as_view(),            name="exam-detail"),
    path("exams/<int:pk>/syllabus/",           ExamSyllabusView.as_view(),          name="exam-syllabus"),
    path("exams/<int:pk>/questions/",          ExamQuestionsView.as_view(),         name="exam-questions"),
    path("exams/<int:pk>/practice/",           ExamPracticeView.as_view(),          name="exam-practice"),
    path("exams/<int:pk>/mock-tests/",         ExamMockTestView.as_view(),          name="exam-mock-tests"),
    path("exams/<int:pk>/study-plan/",         ExamStudyPlanView.as_view(),         name="exam-study-plan"),
    path("exams/<int:pk>/progress/",          ExamProgressView.as_view(),          name="exam-progress"),
]
