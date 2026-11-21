/**
 * JobMatch — Job description analyzer + resume-to-job matching.
 *
 * Paste a job description, match it against a resume, and see
 * matched/missing skills, keywords, recommendations, and tailored suggestions.
 */

import { useEffect, useState } from "react";
import careerApi from "../services/careerApi";
import type { Resume, JobDescription, JobMatchResult } from "../services/careerApi";

export default function JobMatch() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedResume, setSelectedResume] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [jdTitle, setJdTitle] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdText, setJdText] = useState("");
  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, j] = await Promise.all([
          careerApi.listResumes(),
          careerApi.listJobDescriptions(),
        ]);
        setResumes(r.data);
        setJobs(j.data);
      } catch {
        setError("Failed to load data.");
      }
    })();
  }, []);

  async function handleCreateJD() {
    if (!jdTitle.trim() || !jdText.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await careerApi.createJobDescription({
        title: jdTitle.trim(),
        company: jdCompany.trim(),
        raw_text: jdText.trim(),
      });
      setJobs((prev) => [res.data, ...prev]);
      setJdTitle(""); setJdCompany(""); setJdText("");
    } catch {
      setError("Failed to save job description.");
    } finally {
      setCreating(false);
    }
  }

  async function handleMatch() {
    if (!selectedResume || !selectedJob) return;
    setMatching(true);
    setError(null);
    setMatchResult(null);
    try {
      const res = await careerApi.jobMatch(selectedResume, selectedJob);
      setMatchResult(res.data);
    } catch {
      setError("Job match failed. Make sure the LLM is configured.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Job Match Analysis</h1>
      <p className="text-gray-500 text-sm mb-6">
        Paste a job description and match it against your resume to see matched skills, gaps, and recommendations.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* ── JD Input ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Job Description</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Job title (e.g. Python Developer)"
            value={jdTitle}
            onChange={(e) => setJdTitle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <input
            type="text"
            placeholder="Company (optional)"
            value={jdCompany}
            onChange={(e) => setJdCompany(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
        </div>
        <textarea
          placeholder="Paste the full job description here…"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
        />
        <button onClick={handleCreateJD} disabled={!jdTitle.trim() || !jdText.trim() || creating}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${!jdTitle.trim() || !jdText.trim() || creating
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {creating ? "Saving…" : "Save Job Description"}
        </button>
      </div>

      {/* ── Match selector ── */}
      {resumes.length > 0 && jobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Match Resume to Job</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Resume</label>
              <select
                value={selectedResume ?? ""}
                onChange={(e) => setSelectedResume(Number(e.target.value) || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                           focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a resume…</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Job Description</label>
              <select
                value={selectedJob ?? ""}
                onChange={(e) => setSelectedJob(Number(e.target.value) || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                           focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleMatch} disabled={!selectedResume || !selectedJob || matching}
                  className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${!selectedResume || !selectedJob || matching
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
            {matching ? "Analyzing match…" : "Run Match"}
          </button>
        </div>
      )}

      {/* ── Match results ── */}
      {matchResult && (
        <div className="space-y-4">
          {matchResult.match_summary && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
              <p className="text-sm text-gray-600">{matchResult.match_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matched */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-green-700 mb-3">✓ Matched Skills</h3>
              <div className="flex flex-wrap gap-2">
                {matchResult.matched_skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
            {/* Missing */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-red-700 mb-3">△ Needs Practice</h3>
              <div className="flex flex-wrap gap-2">
                {matchResult.missing_skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords */}
          {matchResult.keywords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Important Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {matchResult.keywords.map((k, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {matchResult.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {matchResult.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-indigo-500 mt-0.5">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored suggestions */}
          {Array.isArray(matchResult.tailored_suggestions) && matchResult.tailored_suggestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">✨ Tailored Resume Suggestions</h3>
              <div className="space-y-3">
                {(matchResult.tailored_suggestions as Array<Record<string, string>>).map((sug, i) => (
                  <div key={i} className="border-l-2 border-indigo-200 pl-3">
                    {sug.original && (
                      <p className="text-xs text-gray-400 mb-1">Original: {sug.original}</p>
                    )}
                    {sug.suggested && (
                      <p className="text-sm text-gray-700">{sug.suggested}</p>
                    )}
                    {!sug.original && !sug.suggested && (
                      <p className="text-sm text-gray-700">{JSON.stringify(sug)}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                These are suggestions. Review and apply only what makes sense for your experience.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
