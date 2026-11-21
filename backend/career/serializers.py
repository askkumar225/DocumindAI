from rest_framework import serializers
from .models import (
    Resume, ResumeAnalysis, SkillProfile,
    JobDescription, JobMatch, JobApplication,
    InterviewSession, InterviewQuestion, InterviewAnswer,
)


class ResumeSerializer(serializers.ModelSerializer):
    has_analysis = serializers.SerializerMethodField()

    class Meta:
        model  = Resume
        fields = ["id", "title", "file", "extracted_text", "has_analysis", "created_at", "updated_at"]
        read_only_fields = ["extracted_text", "has_analysis", "created_at", "updated_at"]

    def get_has_analysis(self, obj) -> bool:
        return hasattr(obj, "analysis")


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ResumeAnalysis
        fields = "__all__"
        read_only_fields = fields


class SkillProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SkillProfile
        fields = "__all__"
        read_only_fields = fields


class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = JobDescription
        fields = ["id", "title", "company", "source_url", "raw_text", "created_at"]
        read_only_fields = ["created_at"]


class JobMatchSerializer(serializers.ModelSerializer):
    job_title   = serializers.CharField(source="job.title",   read_only=True)
    job_company = serializers.CharField(source="job.company", read_only=True)

    class Meta:
        model  = JobMatch
        fields = ["id", "resume", "job", "job_title", "job_company",
                  "matched_skills", "missing_skills", "keywords",
                  "recommendations", "match_summary", "created_at"]
        read_only_fields = fields


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = JobApplication
        fields = ["id", "company", "job_title", "job_url", "status",
                  "notes", "next_action", "applied_at", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class InterviewQuestionSerializer(serializers.ModelSerializer):
    has_answer = serializers.SerializerMethodField()

    class Meta:
        model  = InterviewQuestion
        fields = ["id", "question", "category", "difficulty", "order",
                  "why_asked", "answer_guide", "has_answer"]
        read_only_fields = fields

    def get_has_answer(self, obj) -> bool:
        return hasattr(obj, "answer")


class InterviewAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InterviewAnswer
        fields = ["id", "question", "answer_text", "feedback", "strengths",
                  "improvement_areas", "suggested_answer", "simple_answer",
                  "professional_answer", "created_at"]
        read_only_fields = ["feedback", "strengths", "improvement_areas",
                             "suggested_answer", "simple_answer",
                             "professional_answer", "created_at"]


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions       = InterviewQuestionSerializer(many=True, read_only=True)
    resume_title    = serializers.CharField(source="resume.title", read_only=True, default="")
    progress_pct    = serializers.SerializerMethodField()

    class Meta:
        model  = InterviewSession
        fields = ["id", "resume", "resume_title", "job", "interview_type",
                  "difficulty", "total_questions", "completed_questions",
                  "is_complete", "final_feedback", "progress_pct",
                  "questions", "created_at", "updated_at"]
        read_only_fields = ["completed_questions", "is_complete", "final_feedback",
                             "created_at", "updated_at"]

    def get_progress_pct(self, obj) -> int:
        if obj.total_questions == 0:
            return 0
        return round(obj.completed_questions / obj.total_questions * 100)


class InterviewSessionListSerializer(serializers.ModelSerializer):
    resume_title = serializers.CharField(source="resume.title", read_only=True, default="")
    progress_pct = serializers.SerializerMethodField()

    class Meta:
        model  = InterviewSession
        fields = ["id", "resume_title", "interview_type", "difficulty",
                  "total_questions", "completed_questions", "is_complete",
                  "progress_pct", "created_at"]

    def get_progress_pct(self, obj) -> int:
        if obj.total_questions == 0:
            return 0
        return round(obj.completed_questions / obj.total_questions * 100)
