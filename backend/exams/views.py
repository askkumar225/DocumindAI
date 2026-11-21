"""
Government Exam Preparation views.

Endpoints:
    GET    /api/exams/                        — list categories with exam counts
    GET    /api/exams/categories/{slug}/      — exams in a category
    GET    /api/exams/{id}/                   — exam detail (sources + syllabus)
    GET    /api/exams/{id}/syllabus/           — syllabus topics
    GET    /api/exams/{id}/questions/         — list questions (paginated)
    POST   /api/exams/{id}/practice/          — get practice question(s) / submit answer
    GET    /api/exams/{id}/mock-tests/        — list mock tests for exam
    POST   /api/exams/{id}/mock-tests/        — create mock test or submit attempt
    POST   /api/exams/{id}/study-plan/        — generate study plan
    GET    /api/exams/{id}/progress/          — study progress for user+exam
"""

import logging
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ExamCategory, Exam, ExamSource, ExamSyllabus, ExamTopic,
    Question, MockTest, MockAttempt, StudyPlan, StudyProgress,
)
from .serializers import (
    ExamCategorySerializer, ExamListSerializer, ExamDetailSerializer,
    ExamSyllabusSerializer, QuestionSerializer, QuestionPracticeSerializer,
    QuestionResultSerializer, MockTestSerializer, MockAttemptSerializer,
    StudyPlanSerializer, StudyProgressSerializer,
)

logger = logging.getLogger(__name__)


# ─── Exam Categories & Listings ──────────────────────────────────────────────

class ExamListView(APIView):
    """GET /api/exams/ — list all categories with active exams."""

    def get(self, request):
        categories = ExamCategory.objects.all()
        return Response(ExamCategorySerializer(categories, many=True).data)


class ExamCategoryDetailView(APIView):
    """GET /api/exams/categories/{slug}/ — list exams in a category."""

    def get(self, request, slug):
        category = get_object_or_404(ExamCategory, slug=slug)
        exams = category.exams.filter(is_active=True)
        return Response(ExamListSerializer(exams, many=True).data)


class ExamDetailView(APIView):
    """GET /api/exams/{id}/ — exam detail with sources and syllabus."""

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk, is_active=True)
        return Response(ExamDetailSerializer(exam).data)


class ExamSyllabusView(APIView):
    """GET /api/exams/{id}/syllabus/ — syllabus topics for an exam."""

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        syllabus = exam.syllabus_topics.all()
        return Response(ExamSyllabusSerializer(syllabus, many=True).data)


class ExamQuestionsView(APIView):
    """GET /api/exams/{id}/questions/ — list questions for an exam."""

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        questions = exam.questions.all()

        # Optional filters
        subject = request.query_params.get("subject")
        if subject:
            questions = questions.filter(subject=subject)

        difficulty = request.query_params.get("difficulty")
        if difficulty:
            questions = questions.filter(difficulty=difficulty)

        is_pyq = request.query_params.get("is_pyq")
        if is_pyq == "true":
            questions = questions.filter(is_pyq=True)

        # Limit results
        limit = min(int(request.query_params.get("limit", 50)), 100)
        questions = questions[:limit]

        return Response(QuestionSerializer(questions, many=True).data)


# ─── Practice ────────────────────────────────────────────────────────────────

class ExamPracticeView(APIView):
    """
    POST /api/exams/{id}/practice/

    Request body:
        {
            "action": "get" | "submit",
            "question_id": 12,        # for "submit"
            "answer": "B",            # for "submit"
            "count": 10,              # for "get" (optional, default 10)
            "topic_id": 5,            # for "get" (optional filter)
            "difficulty": "MEDIUM"    # for "get" (optional filter)
        }

    Response (action="get"):
        List of questions without answers.

    Response (action="submit"):
        {
            "question_id": 12,
            "correct": true,
            "correct_answer": "B",
            "explanation": "..."
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        action = request.data.get("action", "get")

        if action == "get":
            return self._get_questions(request, exam)
        elif action == "submit":
            return self._submit_answer(request, exam)
        else:
            return Response(
                {"error": "Invalid action. Use 'get' or 'submit'."},
                status=400,
            )

    def _get_questions(self, request, exam):
        questions = exam.questions.all()

        topic_id = request.data.get("topic_id")
        if topic_id:
            questions = questions.filter(topic_id=topic_id)

        difficulty = request.data.get("difficulty")
        if difficulty:
            questions = questions.filter(difficulty=difficulty)

        subject = request.data.get("subject")
        if subject:
            questions = questions.filter(subject=subject)

        is_pyq = request.data.get("is_pyq")
        if is_pyq:
            questions = questions.filter(is_pyq=True)

        count = min(int(request.data.get("count", 10)), 50)
        questions = questions.order_by("?")[:count]

        return Response(QuestionPracticeSerializer(questions, many=True).data)

    def _submit_answer(self, request, exam):
        question_id = request.data.get("question_id")
        user_answer = request.data.get("answer", "").strip().upper()

        if not question_id or not user_answer:
            return Response(
                {"error": "question_id and answer are required."},
                status=400,
            )

        try:
            question = exam.questions.get(pk=question_id)
        except Question.DoesNotExist:
            return Response({"error": "Question not found."}, status=404)

        is_correct = user_answer == question.answer.upper()

        # Update progress
        progress, _ = StudyProgress.objects.get_or_create(
            user=request.user, exam=exam,
        )
        progress.questions_attempted += 1
        if is_correct:
            progress.questions_correct += 1
        progress.save(update_fields=[
            "questions_attempted", "questions_correct", "updated_at",
        ])

        return Response({
            "question_id": question.id,
            "correct": is_correct,
            "correct_answer": question.answer,
            "explanation": question.explanation,
        })


# ─── Mock Tests ──────────────────────────────────────────────────────────────

class ExamMockTestView(APIView):
    """
    GET  /api/exams/{id}/mock-tests/  — list mock tests for an exam
    POST /api/exams/{id}/mock-tests/  — start or submit a mock test

    POST body (start):
        { "action": "start", "mock_test_id": 5 }

    POST body (submit):
        { "action": "submit", "attempt_id": 12, "answers": {"1": "A", "2": "C"} }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        mock_tests = exam.mock_tests.all()
        return Response(MockTestSerializer(mock_tests, many=True).data)

    def post(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        action = request.data.get("action", "start")

        if action == "start":
            return self._start_mock(request, exam)
        elif action == "submit":
            return self._submit_mock(request, exam)
        else:
            return Response(
                {"error": "Invalid action. Use 'start' or 'submit'."},
                status=400,
            )

    def _start_mock(self, request, exam):
        mock_test_id = request.data.get("mock_test_id")
        if not mock_test_id:
            return Response(
                {"error": "mock_test_id is required."},
                status=400,
            )

        try:
            mock_test = exam.mock_tests.get(pk=mock_test_id)
        except MockTest.DoesNotExist:
            return Response({"error": "Mock test not found."}, status=404)

        attempt = MockAttempt.objects.create(
            user=request.user,
            mock_test=mock_test,
        )

        # Return questions without answers
        questions = mock_test.questions.all()
        question_data = QuestionPracticeSerializer(questions, many=True).data

        return Response({
            "attempt_id": attempt.id,
            "mock_test_id": mock_test.id,
            "title": mock_test.title,
            "duration_minutes": mock_test.duration_minutes,
            "total_marks": mock_test.total_marks,
            "questions": question_data,
        }, status=201)

    def _submit_mock(self, request, exam):
        attempt_id = request.data.get("attempt_id")
        answers = request.data.get("answers", {})

        if not attempt_id or not answers:
            return Response(
                {"error": "attempt_id and answers are required."},
                status=400,
            )

        try:
            attempt = MockAttempt.objects.get(
                pk=attempt_id, user=request.user, mock_test__exam=exam
            )
        except MockAttempt.DoesNotExist:
            return Response({"error": "Attempt not found."}, status=404)

        # Score the attempt
        questions = attempt.mock_test.questions.all()
        correct = 0
        total = questions.count()

        for q in questions:
            user_ans = str(answers.get(str(q.id), "")).strip().upper()
            if user_ans and user_ans == q.answer.upper():
                correct += 1

        score = (correct / total * 100) if total > 0 else 0

        attempt.answers = answers
        attempt.score = score
        attempt.total = total
        attempt.is_complete = True
        attempt.save()

        # Update progress
        progress, _ = StudyProgress.objects.get_or_create(
            user=request.user, exam=exam,
        )
        progress.mock_tests_taken += 1
        progress.save(update_fields=["mock_tests_taken", "updated_at"])

        return Response({
            "attempt_id": attempt.id,
            "score": score,
            "correct": correct,
            "total": total,
            "is_complete": True,
        })


# ─── Study Plan ──────────────────────────────────────────────────────────────

class ExamStudyPlanView(APIView):
    """
    POST /api/exams/{id}/study-plan/

    Request body:
        {
            "weeks": 4,                # optional, default 4
            "weak_topics": ["Algebra"]  # optional, focus on weak areas
        }

    Generates a week-by-week study plan.
    If LLM_API_KEY is configured, uses AI. Otherwise, builds from syllabus.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        weeks = min(int(request.data.get("weeks", 4)), 12)
        weak_topics = request.data.get("weak_topics", [])

        plan = self._generate_plan(exam, weeks, weak_topics)

        study_plan = StudyPlan.objects.create(
            user=request.user,
            exam=exam,
            title=f"{exam.name} — {weeks}-Week Plan",
            plan=plan,
        )

        return Response(StudyPlanSerializer(study_plan).data, status=201)

    def _generate_plan(self, exam, weeks, weak_topics):
        """Generate a study plan from syllabus topics."""
        syllabus = exam.syllabus_topics.all()
        all_topics = []
        for s in syllabus:
            subject_topics = s.topics if isinstance(s.topics, list) else [s.subject]
            for t in subject_topics:
                all_topics.append({
                    "subject": s.subject,
                    "topic": t,
                })

        # If no syllabus, create generic plan
        if not all_topics:
            all_topics = [
                {"subject": "General", "topic": f"Topic {i+1}"}
                for i in range(weeks)
            ]

        # Prioritize weak topics first
        if weak_topics:
            weak = [t for t in all_topics if any(
                wt.lower() in t["topic"].lower() or wt.lower() in t["subject"].lower()
                for wt in weak_topics
            )]
            rest = [t for t in all_topics if t not in weak]
            all_topics = weak + rest

        # Distribute across weeks
        per_week = max(1, len(all_topics) // weeks)
        plan = []
        for week in range(weeks):
            start = week * per_week
            end = start + per_week
            week_topics = all_topics[start:end]
            if not week_topics and week == weeks - 1:
                # Remaining topics go in last week
                week_topics = all_topics[end:]

            plan.append({
                "week": week + 1,
                "topics": [t["topic"] for t in week_topics],
                "subject": week_topics[0]["subject"] if week_topics else "General",
                "focus": "Weak areas" if week == 0 and weak_topics else "Regular study",
            })

        return plan


# ─── Study Progress ──────────────────────────────────────────────────────────

class ExamProgressView(APIView):
    """GET /api/exams/{id}/progress/ — user's study progress for an exam."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        progress, _ = StudyProgress.objects.get_or_create(
            user=request.user, exam=exam,
        )
        return Response(StudyProgressSerializer(progress).data)
