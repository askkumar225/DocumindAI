/**
 * InterviewSetup — Interview session list + creation form.
 *
 * Shows past interview sessions and a form to create new ones with
 * resume, job description, interview type, and difficulty selection.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import careerApi from "../services/careerApi";
import type { Resume, JobDescription, InterviewSession } from "../services/careerApi";

const INTERVIEW_TYPES = [
  { value: "QUICK",         label: "Quick Practice" },
  { value: "TECHNICAL",     label: "Technical Interview" },
  { value: "HR",            label: "HR Interview" },
  { value: "PROJECT",       label: "Project Interview" },
  { value: "RESUME_BASED",  label: "Resume-Based Interview" },
  { value: "FULL_MOCK",     label: "Full Mock Interview" },
];

const DIFFICULTIES = [
  { value: "BEGINNER",     label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED",     label: "Advanced" },
  { value: "MIXED",        label: "Mixed" },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    resume_id: "" as string | number,
    job_id: "" as string | number,
    interview_type: "RESUME_BASED",
    difficulty: "MIXED",
    questions: "10",
    target_role: "",
  });

  const load = useCallback(async () => {
    try {
      const [r, j, s] = await Promise.all([
        careerApi.listResumes(),
        careerApi.listJobDescriptions(),
        careerApi.listInterviews(),
      ]);
      setResumes(r.data);
      setJobs(j.data);
      setSessions(s.data);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {
        interview_type: form.interview_type,
        difficulty: form.difficulty,
        questions: Number(form.questions),
        target_role: form.target_role,
      };
      if (form.resume_id) data.resume_id = Number(form.resume_id);
      if (form.job_id) data.job_id = Number(form.job_id);

      const res = await careerApi.createInterview(data);
      navigate(`/interview/${res.data.id}`);
    } catch {
      setError("Failed to create interview. Make sure the LLM is configured.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Interview Coach</h1>
      <p className="text-gray-500 text-sm mb-6">
        Generate role-specific interview questions from your resume and job description, then practice with AI feedback.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* ── Create form ── */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Start New Interview Session</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Resume (optional)</label>
            <select value={form.resume_id} onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                               focus:outline-none focus:border-indigo-500">
              <option value="">No resume</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Job Description (optional)</label>
            <select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                               focus:outline-none focus:border-indigo-500">
              <option value="">No job description</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Interview Type</label>
            <select value={form.interview_type} onChange={(e) => setForm({ ...form, interview_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                               focus:outline-none focus:border-indigo-500">
              {INTERVIEW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                               focus:outline-none focus:border-indigo-500">
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Number of Questions</label>
            <input type="number" min="1" max="30" value={form.questions}
                   onChange={(e) => setForm({ ...form, questions: e.target.value })}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
          </div>
        </div>

        <input type="text" placeholder="Target role (optional, e.g. Python Full Stack Developer)"
               value={form.target_role}
               onChange={(e) => setForm({ ...form, target_role: e.target.value })}
               className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />

        <button type="submit" disabled={creating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${creating ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {creating ? "Generating questions…" : "Start Interview"}
        </button>
      </form>

      {/* ── Past sessions ── */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading…</div>
      ) : sessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Past Sessions</h2>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} onClick={() => navigate(`/interview/${s.id}`)}
                   className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
                              hover:border-indigo-200 transition-colors flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {INTERVIEW_TYPES.find((t) => t.value === s.interview_type)?.label ?? s.interview_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.resume_title && `Resume: ${s.resume_title} · `}
                    {s.difficulty} · {s.completed_questions}/{s.total_questions} answered
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.is_complete ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">In Progress</span>
                  )}
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${s.progress_pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
