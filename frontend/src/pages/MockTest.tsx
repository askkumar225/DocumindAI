/**
 * MockTest — Take a mock test for a government exam.
 *
 * Starts a timed mock test, shows all questions with options,
 * submits answers, and displays the score.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import examApi from "../services/examApi";
import type { MockTestStart, MockTestSubmitResult } from "../services/examApi";

export default function MockTest() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);
  const [searchParams] = useSearchParams();
  const mockTestId = Number(searchParams.get("mock_id"));

  const [testData, setTestData] = useState<MockTestStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MockTestSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const start = useCallback(async () => {
    try {
      const res = await examApi.startMockTest(examId, mockTestId);
      setTestData(res.data);
      setTimeLeft(res.data.duration_minutes * 60);
    } catch {
      setError("Failed to start mock test.");
    } finally {
      setLoading(false);
    }
  }, [examId, mockTestId]);

  useEffect(() => {
    if (mockTestId) start();
  }, [mockTestId, start]);

  // Timer
  useEffect(() => {
    if (!testData || result) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, testData, result]);

  async function handleSubmit() {
    if (!testData || submitting) return;
    setSubmitting(true);
    try {
      const res = await examApi.submitMockTest(examId, testData.attempt_id, answers);
      setResult(res.data);
    } catch {
      setError("Failed to submit mock test.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading mock test…</div>;
  if (error && !testData) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      <Link to={`/exams/${examId}`} className="text-indigo-600 text-sm">← Back to exam</Link>
    </div>
  );
  if (!testData) return null;

  // ── Results screen ──────────────────────────────────────────────────────────
  if (result) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link to={`/exams/${examId}`} className="text-indigo-600 text-sm mb-4 inline-block">← Back to exam</Link>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">{pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "📚"}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Mock Test Complete</h1>
          <p className="text-gray-500 text-sm mb-6">{testData.title}</p>

          <div className="flex items-center justify-center gap-8 mb-6">
            <div>
              <p className="text-4xl font-bold text-indigo-600">{pct}%</p>
              <p className="text-xs text-gray-400 mt-1">Score</p>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div>
              <p className="text-4xl font-bold text-green-600">{result.correct}</p>
              <p className="text-xs text-gray-400 mt-1">Correct</p>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div>
              <p className="text-4xl font-bold text-gray-400">{result.total}</p>
              <p className="text-xs text-gray-400 mt-1">Total</p>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            {pct >= 70 ? "Great work! Keep practicing to maintain your accuracy."
            : pct >= 40 ? "Good effort. Review the questions you missed and try again."
            : "Keep studying! Focus on weak topics and practice more."}
          </p>
        </div>
      </div>
    );
  }

  // ── Test screen ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/exams/${examId}`} className="text-indigo-600 text-sm mb-1 inline-block">← Exit</Link>
          <h1 className="text-xl font-bold text-gray-800">{testData.title}</h1>
        </div>
        <div className={`px-4 py-2 rounded-lg text-sm font-mono font-bold
                        ${timeLeft < 60 ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-700"}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {testData.questions.map((q, qi) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-800 mb-3">
              <span className="text-indigo-500 font-bold mr-2">Q{qi + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.key }))}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors
                              ${answers[q.id] === opt.key
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 text-gray-700 hover:border-indigo-200"}`}
                >
                  <span className="font-semibold mr-2">{opt.key}.</span> {opt.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 px-6 -mx-6 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {Object.keys(answers).length} / {testData.questions.length} answered
        </span>
        <button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length === 0}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
                            ${submitting || Object.keys(answers).length === 0
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {submitting ? "Submitting…" : "Submit Test"}
        </button>
      </div>
    </div>
  );
}
