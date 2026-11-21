/**
 * examApi — Government Exam Preparation service.
 *
 * Covers exam browsing, syllabus, practice, mock tests, study plans,
 * and progress tracking.
 */

import api from "./api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExamCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  exam_count: number;
}

export interface ExamListItem {
  id: number;
  name: string;
  short_name: string;
  description: string;
  is_active: boolean;
  category_name: string;
  category_slug: string;
}

export interface ExamSource {
  id: number;
  title: string;
  publication_date: string | null;
  source_url: string;
  vacancies: number | null;
  age_min: number | null;
  age_max: number | null;
  last_date: string | null;
  raw_text: string;
}

export interface ExamTopic {
  id: number;
  name: string;
  description: string;
}

export interface ExamSyllabus {
  id: number;
  subject: string;
  topics: string[];
  order: number;
  topic_items: ExamTopic[];
}

export interface ExamDetail {
  id: number;
  name: string;
  short_name: string;
  description: string;
  is_active: boolean;
  category_name: string;
  sources: ExamSource[];
  syllabus_topics: ExamSyllabus[];
}

export interface Question {
  id: number;
  exam: number;
  topic: number | null;
  subject: string;
  question: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  difficulty: string;
  year: number | null;
  is_pyq: boolean;
}

export interface PracticeQuestion {
  id: number;
  exam: number;
  topic: number | null;
  subject: string;
  question: string;
  options: { key: string; text: string }[];
  difficulty: string;
  year: number | null;
  is_pyq: boolean;
}

export interface PracticeSubmitResult {
  question_id: number;
  correct: boolean;
  correct_answer: string;
  explanation: string;
}

export interface MockTest {
  id: number;
  exam: number;
  title: string;
  duration_minutes: number;
  total_marks: number;
  question_count: number;
  created_at: string;
}

export interface MockTestStart {
  attempt_id: number;
  mock_test_id: number;
  title: string;
  duration_minutes: number;
  total_marks: number;
  questions: PracticeQuestion[];
}

export interface MockTestSubmitResult {
  attempt_id: number;
  score: number;
  correct: number;
  total: number;
  is_complete: boolean;
}

export interface MockAttempt {
  id: number;
  mock_test: number;
  mock_test_title: string;
  exam_name: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  is_complete: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface StudyPlan {
  id: number;
  exam: number;
  title: string;
  plan: {
    week: number;
    topics: string[];
    subject: string;
    focus: string;
  }[];
  created_at: string;
}

export interface StudyProgress {
  id: number;
  exam: number;
  exam_name: string;
  questions_attempted: number;
  questions_correct: number;
  mock_tests_taken: number;
  weak_topics: string[];
  study_streak: number;
  last_activity: string | null;
  accuracy: number;
  updated_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const examApi = {
  // ── Categories & Listings ────────────────────────────────────────
  listCategories: () =>
    api.get<ExamCategory[]>("/exams/"),

  listExamsByCategory: (slug: string) =>
    api.get<ExamListItem[]>(`/exams/categories/${slug}/`),

  // ── Single Exam ──────────────────────────────────────────────────
  getExam: (id: number) =>
    api.get<ExamDetail>(`/exams/${id}/`),

  getSyllabus: (id: number) =>
    api.get<ExamSyllabus[]>(`/exams/${id}/syllabus/`),

  getQuestions: (id: number, params?: {
    subject?: string; difficulty?: string; is_pyq?: string; limit?: number;
  }) =>
    api.get<Question[]>(`/exams/${id}/questions/`, { params }),

  // ── Practice ────────────────────────────────────────────────────
  getPracticeQuestions: (examId: number, data: {
    count?: number; topic_id?: number; difficulty?: string; subject?: string; is_pyq?: boolean;
  }) =>
    api.post<PracticeQuestion[]>(`/exams/${examId}/practice/`, {
      action: "get", ...data,
    }),

  submitPracticeAnswer: (examId: number, questionId: number, answer: string) =>
    api.post<PracticeSubmitResult>(`/exams/${examId}/practice/`, {
      action: "submit", question_id: questionId, answer,
    }),

  // ── Mock Tests ───────────────────────────────────────────────────
  listMockTests: (examId: number) =>
    api.get<MockTest[]>(`/exams/${examId}/mock-tests/`),

  startMockTest: (examId: number, mockTestId: number) =>
    api.post<MockTestStart>(`/exams/${examId}/mock-tests/`, {
      action: "start", mock_test_id: mockTestId,
    }),

  submitMockTest: (examId: number, attemptId: number, answers: Record<string, string>) =>
    api.post<MockTestSubmitResult>(`/exams/${examId}/mock-tests/`, {
      action: "submit", attempt_id: attemptId, answers,
    }),

  // ── Study Plan ────────────────────────────────────────────────────
  generateStudyPlan: (examId: number, data: { weeks?: number; weak_topics?: string[] }) =>
    api.post<StudyPlan>(`/exams/${examId}/study-plan/`, data),

  // ── Progress ─────────────────────────────────────────────────────
  getProgress: (examId: number) =>
    api.get<StudyProgress>(`/exams/${examId}/progress/`),
};

export default examApi;
