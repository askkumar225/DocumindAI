"""
Serializers for the Government Exam Preparation module.
"""
from rest_framework import serializers
from .models import (
    ExamCategory, Exam, ExamSource, ExamSyllabus, ExamTopic,
    Question, MockTest, MockAttempt, StudyPlan, StudyProgress,
)


class ExamCategorySerializer(serializers.ModelSerializer):
    exam_count = serializers.SerializerMethodField()

    class Meta:
        model = ExamCategory
        fields = ["id", "name", "slug", "icon", "exam_count"]

    def get_exam_count(self, obj):
        return obj.exams.filter(is_active=True).count()


class ExamTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamTopic
        fields = ["id", "name", "description"]


class ExamSyllabusSerializer(serializers.ModelSerializer):
    topic_items = ExamTopicSerializer(many=True, read_only=True)

    class Meta:
        model = ExamSyllabus
        fields = ["id", "subject", "topics", "order", "topic_items"]


class ExamSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSource
        fields = [
            "id", "title", "publication_date", "source_url",
            "vacancies", "age_min", "age_max", "last_date", "raw_text",
        ]


class ExamListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Exam
        fields = ["id", "name", "short_name", "description", "is_active",
                  "category_name", "category_slug"]


class ExamDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    sources = ExamSourceSerializer(many=True, read_only=True)
    syllabus_topics = ExamSyllabusSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = ["id", "name", "short_name", "description", "is_active",
                  "category_name", "sources", "syllabus_topics"]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id", "exam", "topic", "subject", "question", "options",
            "answer", "explanation", "difficulty", "year", "is_pyq",
        ]
        read_only_fields = ["exam", "answer", "explanation"]


class QuestionPracticeSerializer(serializers.ModelSerializer):
    """Serializer for practice — hides answer and explanation until submitted."""
    class Meta:
        model = Question
        fields = ["id", "exam", "topic", "subject", "question", "options",
                  "difficulty", "year", "is_pyq"]
        read_only_fields = fields


class QuestionResultSerializer(serializers.ModelSerializer):
    """Serializer for after answering — includes answer and explanation."""
    class Meta:
        model = Question
        fields = ["id", "question", "options", "answer", "explanation",
                  "difficulty", "subject", "is_pyq"]
        read_only_fields = fields


class MockTestSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = MockTest
        fields = ["id", "exam", "title", "duration_minutes", "total_marks",
                  "question_count", "created_at"]
        read_only_fields = ["exam", "created_at"]

    def get_question_count(self, obj):
        return obj.questions.count()


class MockAttemptSerializer(serializers.ModelSerializer):
    mock_test_title = serializers.CharField(source="mock_test.title", read_only=True)
    exam_name = serializers.CharField(source="mock_test.exam.name", read_only=True)

    class Meta:
        model = MockAttempt
        fields = ["id", "mock_test", "mock_test_title", "exam_name",
                  "answers", "score", "total", "is_complete",
                  "created_at", "completed_at"]
        read_only_fields = ["score", "total", "is_complete", "completed_at", "created_at"]


class StudyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyPlan
        fields = ["id", "exam", "title", "plan", "created_at"]
        read_only_fields = ["created_at"]


class StudyProgressSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    accuracy = serializers.FloatField(read_only=True)

    class Meta:
        model = StudyProgress
        fields = ["id", "exam", "exam_name", "questions_attempted",
                  "questions_correct", "mock_tests_taken", "weak_topics",
                  "study_streak", "last_activity", "accuracy", "updated_at"]
        read_only_fields = fields
