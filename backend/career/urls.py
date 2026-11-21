from django.urls import path
from .views import (
    ResumeListCreateView, ResumeDetailView, ResumeAnalyzeView,
    ResumeImproveView, ResumeSkillsView, SkillGapView, ResumeClaimCheckView,
    JobDescriptionListCreateView, JobMatchView, CoverLetterView,
    JobApplicationListCreateView, JobApplicationDetailView,
    InterviewListCreateView, InterviewDetailView,
    InterviewAnswerView, InterviewCompleteView,
)

urlpatterns = [
    # Resume
    path("career/resumes/",                          ResumeListCreateView.as_view(),    name="career-resume-list"),
    path("career/resumes/<int:pk>/",                 ResumeDetailView.as_view(),        name="career-resume-detail"),
    path("career/resumes/<int:pk>/analyze/",         ResumeAnalyzeView.as_view(),       name="career-resume-analyze"),
    path("career/resumes/<int:pk>/improve/",         ResumeImproveView.as_view(),       name="career-resume-improve"),
    path("career/resumes/<int:pk>/skills/",          ResumeSkillsView.as_view(),        name="career-resume-skills"),
    path("career/resumes/<int:pk>/skill-gap/",       SkillGapView.as_view(),            name="career-skill-gap"),
    path("career/resumes/<int:pk>/claim-check/",     ResumeClaimCheckView.as_view(),    name="career-claim-check"),

    # Job Description
    path("career/job-descriptions/",                 JobDescriptionListCreateView.as_view(), name="career-jd-list"),
    path("career/job-match/",                        JobMatchView.as_view(),            name="career-job-match"),

    # Cover Letter / Email
    path("career/cover-letter/",                     CoverLetterView.as_view(),         name="career-cover-letter"),

    # Applications
    path("career/applications/",                     JobApplicationListCreateView.as_view(), name="career-app-list"),
    path("career/applications/<int:pk>/",            JobApplicationDetailView.as_view(), name="career-app-detail"),

    # Interview
    path("career/interviews/",                       InterviewListCreateView.as_view(), name="career-interview-list"),
    path("career/interviews/<int:pk>/",              InterviewDetailView.as_view(),     name="career-interview-detail"),
    path("career/interviews/<int:pk>/answer/",       InterviewAnswerView.as_view(),     name="career-interview-answer"),
    path("career/interviews/<int:pk>/complete/",     InterviewCompleteView.as_view(),   name="career-interview-complete"),
]
