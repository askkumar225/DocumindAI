/**
 * CoverLetter — AI cover letter and email generator.
 *
 * Generates cover letters, recruiter emails, follow-up emails,
 * application responses, and thank-you messages using only
 * information from the user's resume and job description.
 */

import { useEffect, useState } from "react";
import careerApi from "../services/careerApi";
import type { Resume } from "../services/careerApi";

const TYPES = [
  { value: "cover_letter",   label: "Cover Letter" },
  { value: "recruiter_email", label: "Recruiter Email" },
  { value: "follow_up",       label: "Follow-Up Email" },
  { value: "thank_you",       label: "Thank-You Message" },
];

export default function CoverLetter() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState("cover_letter");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await careerApi.listResumes();
        setResumes(res.data);
      } catch {
        setError("Failed to load resumes.");
      }
    })();
  }, []);

  async function handleGenerate() {
    if (!selectedResume || !jobTitle.trim() || !company.trim()) return;
    setLoading(true);
    setError(null);
    setContent("");
    try {
      const res = await careerApi.generateCoverLetter({
        resume_id: selectedResume,
        job_title: jobTitle.trim(),
        company: company.trim(),
        type,
      });
      setContent(res.data.content);
    } catch {
      setError("Generation failed. Make sure the LLM is configured.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Cover Letter & Email Assistant</h1>
      <p className="text-gray-500 text-sm mb-6">
        Generate cover letters and emails using only your resume and job details.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 mb-6">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Resume</label>
          <select value={selectedResume ?? ""}
                  onChange={(e) => setSelectedResume(Number(e.target.value) || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                             focus:outline-none focus:border-indigo-500">
            <option value="">Select a resume…</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="Job title" value={jobTitle}
                 onChange={(e) => setJobTitle(e.target.value)}
                 className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
          <input type="text" placeholder="Company" value={company}
                 onChange={(e) => setCompany(e.target.value)}
                 className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => setType(t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                                  ${type === t.value
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleGenerate} disabled={!selectedResume || !jobTitle.trim() || !company.trim() || loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${!selectedResume || !jobTitle.trim() || !company.trim() || loading
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {content && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Generated Content</h3>
            <button onClick={handleCopy}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Copy to clipboard
            </button>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            This is AI-generated using your resume and job details. Review and personalize before sending.
          </p>
        </div>
      )}
    </div>
  );
}
