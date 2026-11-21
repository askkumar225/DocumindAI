/**
 * ResumeAnalysis — Resume detail page with AI analysis, skills,
 * claim check, and section improvement.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import careerApi from "../services/careerApi";
import type { Resume, ResumeAnalysis as ResumeAnalysisType } from "../services/careerApi";

export default function ResumeAnalysis() {
  const { id } = useParams<{ id: string }>();
  const resumeId = Number(id);

  const [resume, setResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "skills" | "claim" | "improve">("analysis");

  // ── Improve section state ──────────────────────────────────────────────────
  const [improveSection, setImproveSection] = useState("");
  const [improveContent, setImproveContent] = useState("");
  const [improveResult, setImproveResult] = useState<Record<string, unknown> | null>(null);
  const [improving, setImproving] = useState(false);

  // ── Claim check state ────────────────────────────────────────────────────────
  const [claims, setClaims] = useState<unknown[] | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [resumeRes] = await Promise.all([
        careerApi.getResume(resumeId),
      ]);
      setResume(resumeRes.data);
      // Try to load analysis if it exists
      try {
        const analysisRes = await careerApi.analyzeResume(resumeId);
        setAnalysis(analysisRes.data);
      } catch {
        // No analysis yet — that's fine
      }
    } catch {
      setError("Resume not found.");
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => { load(); }, [load]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await careerApi.analyzeResume(resumeId);
      setAnalysis(res.data);
    } catch {
      setError("Analysis failed. Make sure the backend and LLM are configured.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImprove() {
    if (!improveSection.trim() || !improveContent.trim()) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const res = await careerApi.improveResume(resumeId, improveSection.trim(), improveContent.trim());
      setImproveResult(res.data as Record<string, unknown>);
    } catch {
      setError("Improvement suggestion failed. Try again.");
    } finally {
      setImproving(false);
    }
  }

  async function handleClaimCheck() {
    setClaimLoading(true);
    setClaims(null);
    try {
      const res = await careerApi.claimCheck(resumeId);
      const data = res.data as Record<string, unknown>;
      setClaims((data.claims ?? data.results ?? []) as unknown[]);
    } catch {
      setError("Claim check failed.");
    } finally {
      setClaimLoading(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (error && !resume) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      <Link to="/resume" className="text-indigo-600 text-sm mt-4 inline-block">← Back to resumes</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/resume" className="text-indigo-600 text-sm mb-2 inline-block">← Back to resumes</Link>
          <h1 className="text-2xl font-bold text-gray-800">{resume?.title}</h1>
          <p className="text-gray-400 text-sm">Uploaded {resume ? new Date(resume.created_at).toLocaleDateString() : ""}</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${analyzing ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
        >
          {analyzing ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze Resume"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "analysis", label: "Analysis", icon: "📊" },
          { key: "skills", label: "Skills", icon: "🛠" },
          { key: "claim", label: "Claim Check", icon: "⚠" },
          { key: "improve", label: "Improve", icon: "✨" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === tab.key
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Analysis tab ── */}
      {activeTab === "analysis" && (
        <div>
          {!analysis ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🔬</div>
              <p className="text-gray-400 text-sm mb-4">
                No analysis yet. Click "Analyze Resume" to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ATS Score */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">ATS Readiness Score</h3>
                  <span className={`text-2xl font-bold ${
                    analysis.ats_score >= 70 ? "text-green-600"
                    : analysis.ats_score >= 40 ? "text-yellow-600"
                    : "text-red-600"
                  }`}>
                    {analysis.ats_score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${
                    analysis.ats_score >= 70 ? "bg-green-500"
                    : analysis.ats_score >= 40 ? "bg-yellow-500"
                    : "bg-red-500"
                  }`} style={{ width: `${analysis.ats_score}%` }} />
                </div>
              </div>

              {/* Summary */}
              {analysis.summary && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Issues */}
              {Array.isArray(analysis.issues) && analysis.issues.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Issues Found</h3>
                  <div className="space-y-2">
                    {(analysis.issues as Array<Record<string, string>>).map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-yellow-500 mt-0.5">⚠</span>
                        <span className="text-gray-600">{issue.message ?? issue.issue ?? JSON.stringify(issue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggestions</h3>
                  <div className="space-y-2">
                    {(analysis.suggestions as Array<Record<string, string>>).map((sug, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-indigo-500 mt-0.5">✨</span>
                        <span className="text-gray-600">{sug.suggestion ?? sug.message ?? JSON.stringify(sug)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Skills tab ── */}
      {activeTab === "skills" && (
        <SkillsTab resumeId={resumeId} skills={analysis?.skills ?? []} />
      )}

      {/* ── Claim Check tab ── */}
      {activeTab === "claim" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Cross-checks your resume skills against project descriptions to find overclaiming.
            </p>
            <button onClick={handleClaimCheck} disabled={claimLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                ${claimLoading ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              {claimLoading ? "Checking…" : "Run Claim Check"}
            </button>
          </div>
          {!claims ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">⚠</div>
              <p className="text-gray-400 text-sm">Click "Run Claim Check" to verify your resume claims.</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="text-green-700 text-sm font-medium">No overclaiming detected. Your resume looks consistent!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(claims as Array<Record<string, string>>).map((claim, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-500 text-lg">⚠</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {claim.skill ?? claim.claim ?? "Claim"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {claim.message ?? claim.issue ?? JSON.stringify(claim)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Improve tab ── */}
      {activeTab === "improve" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Get AI suggestions to improve specific sections of your resume. Suggestions are shown for review — nothing is changed automatically.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Section</label>
              <input
                type="text"
                placeholder="e.g. Summary, Experience, Skills, Projects"
                value={improveSection}
                onChange={(e) => setImproveSection(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Content</label>
              <textarea
                placeholder="Paste the section content you want to improve…"
                value={improveContent}
                onChange={(e) => setImproveContent(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              />
            </div>
            <button onClick={handleImprove} disabled={!improveSection.trim() || !improveContent.trim() || improving}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                ${!improveSection.trim() || !improveContent.trim() || improving
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              {improving ? "Generating suggestion…" : "Get Improvement Suggestion"}
            </button>
          </div>

          {improveResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Suggestion</h3>
              <div className="space-y-3 text-sm">
                {String(improveResult.improved || "") && (
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-1">Improved Version:</p>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {String(improveResult.improved)}
                    </p>
                  </div>
                )}
                {String(improveResult.explanation || "") && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Why:</p>
                    <p className="text-gray-600 leading-relaxed">{String(improveResult.explanation)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skills sub-tab ─────────────────────────────────────────────────────────

function SkillsTab({ resumeId, skills }: { resumeId: number; skills: string[] }) {
  const [allSkills, setAllSkills] = useState<string[]>(skills);
  const [loading, setLoading] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [gapResult, setGapResult] = useState<Record<string, unknown> | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  async function loadSkills() {
    setLoading(true);
    try {
      const res = await careerApi.getSkills(resumeId);
      setAllSkills(res.data.all_skills);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (skills.length === 0) loadSkills();
  }, []);

  async function handleGap() {
    if (!targetRole.trim()) return;
    setGapLoading(true);
    setGapResult(null);
    try {
      const res = await careerApi.skillGap(resumeId, targetRole.trim());
      setGapResult(res.data as unknown as Record<string, unknown>);
    } catch {
      // silent
    } finally {
      setGapLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Skills list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Detected Skills</h3>
          <button onClick={loadSkills} disabled={loading}
                  className="text-xs text-indigo-600 hover:text-indigo-700">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {allSkills.length === 0 ? (
          <p className="text-sm text-gray-400">No skills detected yet. Analyze your resume first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Skill gap analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Skill Gap Analysis</h3>
        <p className="text-xs text-gray-400 mb-3">Enter a target role to see what skills you're missing.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Python Full Stack Developer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <button onClick={handleGap} disabled={!targetRole.trim() || gapLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${!targetRole.trim() || gapLoading
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
            {gapLoading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {gapResult && (
          <div className="mt-4 space-y-3">
            {Boolean(gapResult.match_summary) && (
              <p className="text-sm text-gray-600">{String(gapResult.match_summary)}</p>
            )}
            {Array.isArray(gapResult.have) && gapResult.have.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 mb-1">✓ Matched Skills</p>
                <div className="flex flex-wrap gap-2">
                  {(gapResult.have as string[]).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(gapResult.missing) && gapResult.missing.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">△ Needs Practice</p>
                <div className="flex flex-wrap gap-2">
                  {(gapResult.missing as string[]).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(gapResult.learning_roadmap) && gapResult.learning_roadmap.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-2">📚 Suggested Learning Roadmap</p>
                <div className="space-y-1.5">
                  {(gapResult.learning_roadmap as Array<Record<string, string>>).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-xs font-bold text-gray-400 w-6">W{item.week ?? i + 1}</span>
                      <span>{item.topic ?? item.description ?? JSON.stringify(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
