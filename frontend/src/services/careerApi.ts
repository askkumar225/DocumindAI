/**
 * careerApi — Career AI service for resumes, jobs, interviews, and applications.
 *
 * All Career AI HTTP calls go through this module.
 */

import api from "./api";

// ─── Resume Types ─────────────────────────────────────────────────────────────

export interface Resume {
  id: number;
  title: string;
  file: string;
  extracted_text: string;
  has_analysis: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeAnalysis {
  id: number;
  resume: number;
  summary: string;
  skills: string[];
  sections: Record<string, unknown>;
  issues: unknown[];
  suggestions: unknown[];
  target_role: string;
  ats_score: number;
  created_at: string;
  updated_at: string;
}

export interface SkillProfile {
  resume_id: number;
  all_skills: string[];
  categorized: Record<string, string[]>;
}

export interface SkillGapResult {
  target_role: string;
  have: string[];
  missing: string[];
  recommended_topics: unknown[];
  learning_roadmap: unknown[];
  match_summary: string;
}

// ─── Job Types ────────────────────────────────────────────────────────────────

export interface JobDescription {
  id: number;
  title: string;
  company: string;
  source_url: string;
  raw_text: string;
  created_at: string;
}

export interface JobMatchResult {
  id: number;
  resume: number;
  job: number;
  job_title: string;
  job_company: string;
  matched_skills: string[];
  missing_skills: string[];
  keywords: string[];
  recommendations: string[];
  match_summary: string;
  created_at: string;
  tailored_suggestions: unknown[];
}

// ─── Application Types ────────────────────────────────────────────────────────

export interface JobApplication {
  id: number;
  company: string;
  job_title: string;
  job_url: string;
  status: "SAVED" | "APPLIED" | "TEST" | "INTERVIEW" | "OFFER" | "REJECTED";
  notes: string;
  next_action: string;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Interview Types ──────────────────────────────────────────────────────────

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  difficulty: string;
  order: number;
  why_asked: string;
  answer_guide: string;
  has_answer: boolean;
}

export interface InterviewSession {
  id: number;
  resume: number | null;
  resume_title: string;
  job: number | null;
  interview_type: string;
  difficulty: string;
  total_questions: number;
  completed_questions: number;
  is_complete: boolean;
  final_feedback: string;
  progress_pct: number;
  questions: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

export interface InterviewAnswerResult {
  answer_id: number;
  feedback: string;
  strengths: string[];
  improvement_areas: string[];
  suggested_answer: string;
  simple_answer: string;
  professional_answer: string;
  answer_structure: string[];
  next_question_index: number;
  total_questions: number;
}

export interface InterviewCompleteResult {
  session_id: number;
  is_complete: boolean;
  answered: number;
  total: number;
  final_feedback: string;
}

// ─── Cover Letter Types ───────────────────────────────────────────────────────

export interface CoverLetterResult {
  type: string;
  content: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const careerApi = {
  // ── Resume ──────────────────────────────────────────────────────
  listResumes: () =>
    api.get<Resume[]>("/career/resumes/"),

  uploadResume: (file: File, title: string) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    return api.post<Resume>("/career/resumes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getResume: (id: number) =>
    api.get<Resume>(`/career/resumes/${id}/`),

  deleteResume: (id: number) =>
    api.delete(`/career/resumes/${id}/`),

  analyzeResume: (id: number) =>
    api.post<ResumeAnalysis>(`/career/resumes/${id}/analyze/`),

  improveResume: (id: number, section: string, content: string, targetRole?: string) =>
    api.post(`/career/resumes/${id}/improve/`, {
      section, content, target_role: targetRole ?? "",
    }),

  getSkills: (id: number) =>
    api.get<SkillProfile>(`/career/resumes/${id}/skills/`),

  skillGap: (id: number, targetRole: string) =>
    api.post<SkillGapResult>(`/career/resumes/${id}/skill-gap/`, {
      target_role: targetRole,
    }),

  claimCheck: (id: number) =>
    api.post(`/career/resumes/${id}/claim-check/`),

  // ── Job Descriptions ─────────────────────────────────────────────
  listJobDescriptions: () =>
    api.get<JobDescription[]>("/career/job-descriptions/"),

  createJobDescription: (data: {
    title: string; company?: string; source_url?: string; raw_text: string;
  }) =>
    api.post<JobDescription>("/career/job-descriptions/", data),

  // ── Job Match ────────────────────────────────────────────────────
  jobMatch: (resumeId: number, jobId: number) =>
    api.post<JobMatchResult>("/career/job-match/", {
      resume_id: resumeId, job_id: jobId,
    }),

  // ── Cover Letter ────────────────────────────────────────────────
  generateCoverLetter: (data: {
    resume_id: number; job_title: string; company: string; type?: string;
  }) =>
    api.post<CoverLetterResult>("/career/cover-letter/", data),

  // ── Job Applications ─────────────────────────────────────────────
  listApplications: () =>
    api.get<JobApplication[]>("/career/applications/"),

  createApplication: (data: Partial<JobApplication>) =>
    api.post<JobApplication>("/career/applications/", data),

  updateApplication: (id: number, data: Partial<JobApplication>) =>
    api.patch<JobApplication>(`/career/applications/${id}/`, data),

  deleteApplication: (id: number) =>
    api.delete(`/career/applications/${id}/`),

  // ── Interviews ───────────────────────────────────────────────────
  listInterviews: () =>
    api.get<InterviewSession[]>("/career/interviews/"),

  createInterview: (data: {
    resume_id?: number; job_id?: number;
    interview_type?: string; difficulty?: string;
    questions?: number; target_role?: string;
  }) =>
    api.post<InterviewSession>("/career/interviews/", data),

  getInterview: (id: number) =>
    api.get<InterviewSession>(`/career/interviews/${id}/`),

  submitAnswer: (sessionId: number, questionId: number, answer: string) =>
    api.post<InterviewAnswerResult>(`/career/interviews/${sessionId}/answer/`, {
      question_id: questionId, answer,
    }),

  completeInterview: (id: number) =>
    api.post<InterviewCompleteResult>(`/career/interviews/${id}/complete/`),
};

export default careerApi;
