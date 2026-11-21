"""
Career AI views — all 15+ endpoints for Resume, Jobs, Interviews, Applications.
"""
import logging
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Resume, ResumeAnalysis, SkillProfile,
    JobDescription, JobMatch, JobApplication,
    InterviewSession, InterviewQuestion, InterviewAnswer,
)
from .serializers import (
    ResumeSerializer, ResumeAnalysisSerializer, SkillProfileSerializer,
    JobDescriptionSerializer, JobMatchSerializer, JobApplicationSerializer,
    InterviewSessionSerializer, InterviewSessionListSerializer,
    InterviewQuestionSerializer, InterviewAnswerSerializer,
)
from .services.resume_parser    import parse_resume
from .services.resume_analyzer  import analyze_resume
from .services.resume_improver  import improve_section
from .services.skill_extractor  import extract_skills
from .services.skill_gap        import analyze_skill_gap
from .services.job_match        import match_resume_to_job
from .services.cover_letter     import generate_cover_letter, generate_email
from .services.interview_generator import generate_questions
from .services.interview_evaluator import evaluate_answer
from .services.resume_claim_checker import check_claims

logger = logging.getLogger(__name__)


# ─── Resume ───────────────────────────────────────────────────────────────────

class ResumeListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get(self, request):
        resumes = Resume.objects.filter(user=request.user)
        return Response(ResumeSerializer(resumes, many=True, context={"request": request}).data)

    def post(self, request):
        ser = ResumeSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        resume = ser.save(user=request.user)

        # Auto-extract text
        text = parse_resume(resume)
        if text:
            resume.extracted_text = text
            resume.save(update_fields=["extracted_text"])

        return Response(ResumeSerializer(resume, context={"request": request}).data, status=201)


class ResumeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return Resume.objects.get(pk=pk, user=user)
        except Resume.DoesNotExist:
            return None

    def get(self, request, pk):
        r = self._get(pk, request.user)
        if not r:
            return Response({"error": "Not found."}, status=404)
        return Response(ResumeSerializer(r, context={"request": request}).data)

    def delete(self, request, pk):
        r = self._get(pk, request.user)
        if not r:
            return Response({"error": "Not found."}, status=404)
        r.delete()
        return Response(status=204)


class ResumeAnalyzeView(APIView):
    """POST /api/career/resumes/{id}/analyze/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        text = resume.extracted_text or parse_resume(resume)
        if not text:
            return Response({"error": "No text extracted from resume."}, status=400)

        result = analyze_resume(text)
        skills = extract_skills(text)

        analysis, _ = ResumeAnalysis.objects.update_or_create(
            resume=resume,
            defaults={
                "summary":     result.get("summary", ""),
                "sections":    result.get("sections", {}),
                "issues":      result.get("issues", []),
                "suggestions": result.get("suggestions", []),
                "ats_score":   result.get("ats_score", 0),
                "skills":      skills.get("all_skills", []),
            },
        )

        SkillProfile.objects.update_or_create(
            resume=resume,
            defaults={
                "skills":             skills.get("all_skills", []),
                "recommended_topics": [],
            },
        )

        return Response(ResumeAnalysisSerializer(analysis).data)


class ResumeImproveView(APIView):
    """POST /api/career/resumes/{id}/improve/  body: {section, content, target_role?}"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        section     = request.data.get("section", "")
        content     = request.data.get("content", "")
        target_role = request.data.get("target_role", "")

        if not section or not content:
            return Response({"error": "section and content are required."}, status=400)

        result = improve_section(section, content, target_role)
        return Response(result)


class ResumeSkillsView(APIView):
    """GET /api/career/resumes/{id}/skills/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        text   = resume.extracted_text or parse_resume(resume)
        skills = extract_skills(text)

        profile, _ = SkillProfile.objects.update_or_create(
            resume=resume,
            defaults={"skills": skills.get("all_skills", [])},
        )

        return Response({
            "resume_id":   resume.id,
            "all_skills":  skills.get("all_skills", []),
            "categorized": skills.get("categorized", {}),
        })


class SkillGapView(APIView):
    """POST /api/career/resumes/{id}/skill-gap/  body: {target_role}"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        target_role = request.data.get("target_role", "").strip()
        if not target_role:
            return Response({"error": "target_role is required."}, status=400)

        skills_data = extract_skills(resume.extracted_text or "")
        skills      = skills_data.get("all_skills", [])
        gap         = analyze_skill_gap(skills, target_role)

        SkillProfile.objects.update_or_create(
            resume=resume,
            defaults={
                "skills":             skills,
                "missing_skills":     gap.get("missing", []),
                "recommended_topics": gap.get("recommended_topics", []),
                "target_role":        target_role,
            },
        )

        return Response({
            "target_role":        target_role,
            "have":               gap.get("have", []),
            "missing":            gap.get("missing", []),
            "recommended_topics": gap.get("recommended_topics", []),
            "learning_roadmap":   gap.get("learning_roadmap", []),
            "match_summary":      gap.get("match_summary", ""),
        })


class ResumeClaimCheckView(APIView):
    """POST /api/career/resumes/{id}/claim-check/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        result = check_claims(resume.extracted_text or "")
        return Response(result)


# ─── Job Description ──────────────────────────────────────────────────────────

class JobDescriptionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jds = JobDescription.objects.filter(user=request.user)
        return Response(JobDescriptionSerializer(jds, many=True).data)

    def post(self, request):
        ser = JobDescriptionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        jd = ser.save(user=request.user)
        return Response(JobDescriptionSerializer(jd).data, status=201)


class JobMatchView(APIView):
    """POST /api/career/job-match/  body: {resume_id, job_id}"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resume_id = request.data.get("resume_id")
        job_id    = request.data.get("job_id")

        try:
            resume = Resume.objects.get(pk=resume_id, user=request.user)
            jd     = JobDescription.objects.get(pk=job_id, user=request.user)
        except (Resume.DoesNotExist, JobDescription.DoesNotExist):
            return Response({"error": "Resume or Job not found."}, status=404)

        result = match_resume_to_job(resume.extracted_text, jd.raw_text)

        match, _ = JobMatch.objects.update_or_create(
            resume=resume, job=jd,
            defaults={
                "matched_skills":  result.get("matched_skills", []),
                "missing_skills":  result.get("missing_skills", []),
                "keywords":        result.get("keywords", []),
                "recommendations": result.get("recommendations", []),
                "match_summary":   result.get("match_summary", ""),
            },
        )

        data = JobMatchSerializer(match).data
        data["tailored_suggestions"] = result.get("tailored_suggestions", [])
        return Response(data)


# ─── Cover Letter ─────────────────────────────────────────────────────────────

class CoverLetterView(APIView):
    """POST /api/career/cover-letter/  body: {resume_id, job_title, company, type?}"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resume_id  = request.data.get("resume_id")
        job_title  = request.data.get("job_title", "")
        company    = request.data.get("company", "")
        email_type = request.data.get("type", "cover_letter")

        try:
            resume = Resume.objects.get(pk=resume_id, user=request.user)
        except Resume.DoesNotExist:
            return Response({"error": "Resume not found."}, status=404)

        skills  = extract_skills(resume.extracted_text or "").get("all_skills", [])

        if email_type == "cover_letter":
            text = generate_cover_letter(resume.extracted_text or "", job_title, company, skills)
        else:
            text = generate_email(email_type, job_title, company, request.user.username)

        return Response({"type": email_type, "content": text})


# ─── Job Application Tracker ──────────────────────────────────────────────────

class JobApplicationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        apps = JobApplication.objects.filter(user=request.user)
        return Response(JobApplicationSerializer(apps, many=True).data)

    def post(self, request):
        ser = JobApplicationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        app = ser.save(user=request.user)
        return Response(JobApplicationSerializer(app).data, status=201)


class JobApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return JobApplication.objects.get(pk=pk, user=user)
        except JobApplication.DoesNotExist:
            return None

    def patch(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return Response({"error": "Not found."}, status=404)
        ser = JobApplicationSerializer(app, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return Response({"error": "Not found."}, status=404)
        app.delete()
        return Response(status=204)


# ─── Interview ────────────────────────────────────────────────────────────────

class InterviewListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = InterviewSession.objects.filter(user=request.user)
        return Response(InterviewSessionListSerializer(sessions, many=True).data)

    def post(self, request):
        resume_id      = request.data.get("resume_id")
        job_id         = request.data.get("job_id")
        interview_type = request.data.get("interview_type", "RESUME_BASED")
        difficulty     = request.data.get("difficulty", "MIXED")
        count          = int(request.data.get("questions", 10))
        target_role    = request.data.get("target_role", "")

        resume = None
        resume_text = ""
        if resume_id:
            try:
                resume = Resume.objects.get(pk=resume_id, user=request.user)
                resume_text = resume.extracted_text or ""
            except Resume.DoesNotExist:
                return Response({"error": "Resume not found."}, status=404)

        jd = None
        jd_text = ""
        if job_id:
            try:
                jd = JobDescription.objects.get(pk=job_id, user=request.user)
                jd_text = jd.raw_text or ""
            except JobDescription.DoesNotExist:
                pass

        questions_data = generate_questions(
            resume_text=resume_text,
            jd_text=jd_text,
            interview_type=interview_type,
            difficulty=difficulty,
            count=count,
            target_role=target_role,
        )

        session = InterviewSession.objects.create(
            user=request.user,
            resume=resume,
            job=jd,
            interview_type=interview_type,
            difficulty=difficulty,
            total_questions=len(questions_data),
        )

        for i, q in enumerate(questions_data):
            InterviewQuestion.objects.create(
                session=session,
                question=q.get("question", ""),
                category=q.get("category", ""),
                difficulty=q.get("difficulty", difficulty),
                order=i,
                why_asked=q.get("why_asked", ""),
                answer_guide=q.get("answer_guide", ""),
            )

        return Response(InterviewSessionSerializer(session).data, status=201)


class InterviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return InterviewSession.objects.prefetch_related("questions__answer").get(pk=pk, user=user)
        except InterviewSession.DoesNotExist:
            return None

    def get(self, request, pk):
        s = self._get(pk, request.user)
        if not s:
            return Response({"error": "Not found."}, status=404)
        return Response(InterviewSessionSerializer(s).data)


class InterviewAnswerView(APIView):
    """POST /api/career/interviews/{id}/answer/  body: {question_id, answer}"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = InterviewSession.objects.get(pk=pk, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        question_id = request.data.get("question_id")
        answer_text = request.data.get("answer", "").strip()

        if not question_id or not answer_text:
            return Response({"error": "question_id and answer are required."}, status=400)

        try:
            question = session.questions.get(pk=question_id)
        except InterviewQuestion.DoesNotExist:
            return Response({"error": "Question not found."}, status=404)

        feedback = evaluate_answer(
            question=question.question,
            answer=answer_text,
            category=question.category,
        )

        ia, _ = InterviewAnswer.objects.update_or_create(
            question=question,
            defaults={
                "answer_text":          answer_text,
                "feedback":             feedback.get("feedback", ""),
                "strengths":            feedback.get("strengths", []),
                "improvement_areas":    feedback.get("improvement_areas", []),
                "suggested_answer":     feedback.get("suggested_answer", ""),
                "simple_answer":        feedback.get("simple_answer", ""),
                "professional_answer":  feedback.get("professional_answer", ""),
            },
        )

        # Update progress
        answered_count = InterviewAnswer.objects.filter(
            question__session=session
        ).count()
        session.completed_questions = answered_count
        session.save(update_fields=["completed_questions", "updated_at"])

        return Response({
            "answer_id":            ia.id,
            "feedback":             ia.feedback,
            "strengths":            ia.strengths,
            "improvement_areas":    ia.improvement_areas,
            "suggested_answer":     ia.suggested_answer,
            "simple_answer":        ia.simple_answer,
            "professional_answer":  ia.professional_answer,
            "answer_structure":     feedback.get("answer_structure", []),
            "next_question_index":  question.order + 1,
            "total_questions":      session.total_questions,
        })


class InterviewCompleteView(APIView):
    """POST /api/career/interviews/{id}/complete/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = InterviewSession.objects.get(pk=pk, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        answers = InterviewAnswer.objects.filter(question__session=session)
        count   = answers.count()

        # Build a summary from answers
        summary_parts = []
        for a in answers.select_related("question")[:5]:
            summary_parts.append(f"Q: {a.question.question}\nFeedback: {a.feedback}")

        summary_text = "\n\n".join(summary_parts)
        final_fb = (
            f"Interview completed. {count}/{session.total_questions} questions answered.\n\n"
            + (summary_text[:500] if summary_text else "Good effort! Review each question's feedback.")
        )

        session.is_complete         = True
        session.final_feedback      = final_fb
        session.completed_questions = count
        session.save(update_fields=["is_complete", "final_feedback", "completed_questions", "updated_at"])

        return Response({
            "session_id":     session.id,
            "is_complete":    True,
            "answered":       count,
            "total":          session.total_questions,
            "final_feedback": final_fb,
        })
