/**
 * ExamDetails — Exam detail with syllabus, sources, practice,
 * mock tests, study plan, and progress.
 *
 * Tabs: Overview | Syllabus | Practice | Mock Tests | Study Plan | Progress
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import examApi from "../services/examApi";
import type {
  ExamDetail,
  PracticeQuestion,
  PracticeSubmitResult,
  StudyPlan,
  StudyProgress,
  MockTest as MockTestType,
} from "../services/examApi";

type Tab = "overview" | "syllabus" | "practice" | "mock" | "plan" | "progress";

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Practice state
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState<PracticeSubmitResult | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  // Mock test state
  const [mockTests, setMockTests] = useState<MockTestType[]>([]);

  // Study plan state
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Progress state
  const [progress, setProgress] = useState<StudyProgress | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await examApi.getExam(examId);
      setExam(res.data);
    } catch {
      setError("Exam not found.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  // Load mock tests when switching to mock tab
  useEffect(() => {
    if (tab === "mock" && mockTests.length === 0) {
      examApi.listMockTests(examId).then((r) => setMockTests(r.data)).catch(() => {});
    }
    if (tab === "progress") {
      examApi.getProgress(examId).then((r) => setProgress(r.data)).catch(() => {});
    }
  }, [tab, examId, mockTests.length]);

  // ── Practice handlers ──────────────────────────────────────────────────────
  async function loadPractice() {
    setPracticeLoading(true);
    setPracticeResult(null);
    setSelectedAnswer("");
    try {
      const res = await examApi.getPracticeQuestions(examId, { count: 10 });
      setPracticeQuestions(res.data);
      setPracticeIdx(0);
    } catch {
      setError("No practice questions available.");
    } finally {
      setPracticeLoading(false);
    }
  }

  async function submitPractice() {
    const q = practiceQuestions[practiceIdx];
    if (!q || !selectedAnswer) return;
    setPracticeLoading(true);
    try {
      const res = await examApi.submitPracticeAnswer(examId, q.id, selectedAnswer);
      setPracticeResult(res.data);
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setPracticeLoading(false);
    }
  }

  function nextPractice() {
    setPracticeResult(null);
    setSelectedAnswer("");
    setPracticeIdx((prev) => prev + 1);
  }

  // ── Study plan handler ─────────────────────────────────────────────────────
  async function generatePlan() {
    setPlanLoading(true);
    try {
      const res = await examApi.generateStudyPlan(examId, { weeks: 4 });
      setPlan(res.data);
    } catch {
      setError("Failed to generate study plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (error && !exam) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      <Link to="/exams" className="text-indigo-600 text-sm mt-4 inline-block">← Back to exams</Link>
    </div>
  );
  if (!exam) return null;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📋" },
    { key: "syllabus", label: "Syllabus", icon: "📚" },
    { key: "practice", label: "Practice", icon: "✏" },
    { key: "mock", label: "Mock Tests", icon: "📝" },
    { key: "plan", label: "Study Plan", icon: "📅" },
    { key: "progress", label: "Progress", icon: "📈" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <Link to="/exams" className="text-indigo-600 text-sm mb-2 inline-block">← Back to exams</Link>
      <h1 className="text-2xl font-bold text-gray-800">{exam.name}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {exam.category_name}{exam.short_name ? ` · ${exam.short_name}` : ""}
      </p>

      {exam.description && (
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{exam.description}</p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                              ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {exam.sources.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Official Notifications</h3>
              <div className="space-y-3">
                {exam.sources.map((src) => (
                  <div key={src.id} className="border-l-2 border-indigo-200 pl-3">
                    <p className="text-sm font-medium text-gray-800">{src.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      {src.publication_date && <span>Published: {new Date(src.publication_date).toLocaleDateString()}</span>}
                      {src.vacancies != null && <span>Vacancies: {src.vacancies}</span>}
                      {src.age_min != null && <span>Age: {src.age_min}–{src.age_max}</span>}
                      {src.last_date && <span>Last date: {new Date(src.last_date).toLocaleDateString()}</span>}
                    </div>
                    {src.source_url && (
                      <a href={src.source_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-indigo-500 hover:underline mt-1 inline-block">View official notification →</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {exam.sources.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No official notifications linked yet. Ask your administrator to add sources via Django admin.
            </p>
          )}
        </div>
      )}

      {/* ── Syllabus ── */}
      {tab === "syllabus" && (
        <div className="space-y-3">
          {exam.syllabus_topics.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No syllabus available yet.</p>
          ) : (
            exam.syllabus_topics.map((syl) => (
              <div key={syl.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">{syl.subject}</h3>
                {syl.topic_items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {syl.topic_items.map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {topic.name}
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(syl.topics) && syl.topics.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {syl.topics.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {t}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No topics listed.</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Practice ── */}
      {tab === "practice" && (
        <div>
          {practiceQuestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">✏</div>
              <p className="text-gray-400 text-sm mb-4">Test your knowledge with practice questions.</p>
              <button onClick={loadPractice} disabled={practiceLoading}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                {practiceLoading ? "Loading…" : "Start Practice"}
              </button>
            </div>
          ) : practiceIdx >= practiceQuestions.length ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-600 text-sm mb-4">Practice complete! You answered all questions.</p>
              <button onClick={loadPractice} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Practice Again
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400">Question {practiceIdx + 1} of {practiceQuestions.length}</span>
                {practiceQuestions[practiceIdx].is_pyq && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">PYQ {practiceQuestions[practiceIdx].year}</span>
                )}
              </div>
              <p className="text-base font-medium text-gray-800 mb-4">
                {practiceQuestions[practiceIdx].question}
              </p>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {practiceQuestions[practiceIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => !practiceResult && setSelectedAnswer(opt.key)}
                    disabled={!!practiceResult}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors
                                ${practiceResult
                                  ? opt.key === practiceResult.correct_answer
                                    ? "border-green-400 bg-green-50 text-green-700"
                                    : selectedAnswer === opt.key
                                      ? "border-red-400 bg-red-50 text-red-700"
                                      : "border-gray-200 text-gray-500"
                                  : selectedAnswer === opt.key
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : "border-gray-200 text-gray-700 hover:border-indigo-200"}`}
                  >
                    <span className="font-semibold mr-2">{opt.key}.</span> {opt.text}
                  </button>
                ))}
              </div>

              {/* Result */}
              {practiceResult && (
                <div className="space-y-3 mb-4">
                  <div className={`rounded-lg p-3 text-sm ${practiceResult.correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {practiceResult.correct ? "✓ Correct!" : `✗ Wrong. Correct answer: ${practiceResult.correct_answer}`}
                  </div>
                  {practiceResult.explanation && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                      <span className="font-semibold">Explanation: </span>{practiceResult.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {!practiceResult ? (
                <button onClick={submitPractice} disabled={!selectedAnswer || practiceLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${!selectedAnswer || practiceLoading
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                  {practiceLoading ? "Submitting…" : "Submit Answer"}
                </button>
              ) : (
                <button onClick={nextPractice}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                  {practiceIdx + 1 >= practiceQuestions.length ? "Finish" : "Next Question →"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mock Tests ── */}
      {tab === "mock" && (
        <div>
          {mockTests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No mock tests available yet. Ask your administrator to add mock tests via Django admin.
            </p>
          ) : (
            <div className="space-y-3">
              {mockTests.map((mt) => (
                <Link key={mt.id} to={`/exams/${examId}/mock-test?mock_id=${mt.id}`}
                      className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between
                                 hover:border-indigo-200 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{mt.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {mt.duration_minutes} min · {mt.total_marks} marks · {mt.question_count} questions
                    </p>
                  </div>
                  <span className="text-indigo-500 text-sm">Start →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Study Plan ── */}
      {tab === "plan" && (
        <div>
          {!plan ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-gray-400 text-sm mb-4">Generate a personalized study plan based on the exam syllabus.</p>
              <button onClick={generatePlan} disabled={planLoading}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                {planLoading ? "Generating…" : "Generate 4-Week Study Plan"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">{plan.title}</h3>
              {plan.plan.map((week, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-indigo-700">Week {week.week}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{week.focus}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{week.subject}</p>
                  <div className="space-y-1">
                    {week.topics.map((topic, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-indigo-400">→</span> {topic}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Progress ── */}
      {tab === "progress" && (
        <div>
          {!progress ? (
            <p className="text-sm text-gray-400 text-center py-8">No progress data yet. Start practicing to track your progress.</p>
          ) : (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Attempted" value={progress.questions_attempted} icon="✏" />
                <StatCard label="Correct" value={progress.questions_correct} icon="✓" color="green" />
                <StatCard label="Accuracy" value={`${progress.accuracy}%`} icon="🎯" color="indigo" />
                <StatCard label="Mock Tests" value={progress.mock_tests_taken} icon="📝" color="purple" />
              </div>

              {/* Study streak */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Study Streak</p>
                  <p className="text-2xl font-bold text-orange-500">{progress.study_streak} days</p>
                </div>
                {progress.last_activity && (
                  <p className="text-xs text-gray-400 ml-auto">Last: {new Date(progress.last_activity).toLocaleDateString()}</p>
                )}
              </div>

              {/* Weak topics */}
              {progress.weak_topics.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Weak Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {progress.weak_topics.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color = "gray" }: {
  label: string; value: string | number; icon: string; color?: string;
}) {
  const colors: Record<string, string> = {
    green: "text-green-600 bg-green-50",
    indigo: "text-indigo-600 bg-indigo-50",
    purple: "text-purple-600 bg-purple-50",
    gray: "text-gray-600 bg-gray-50",
  };
  return (
    <div className={`rounded-xl border border-gray-200 p-4 text-center ${colors[color]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
