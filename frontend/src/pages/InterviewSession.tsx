/**
 * InterviewSession — Active interview practice page.
 *
 * Shows questions one by one, accepts answers, shows AI feedback
 * (strengths, improvement areas, suggested/simple/professional answers),
 * and displays final feedback when completed.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import careerApi from "../services/careerApi";
import type { InterviewSession as Session, InterviewAnswerResult } from "../services/careerApi";

export default function InterviewSession() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<InterviewAnswerResult | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await careerApi.getInterview(sessionId);
      setSession(res.data);
      // Move to first unanswered question
      const firstUnanswered = res.data.questions.findIndex((q) => !q.has_answer);
      setCurrentIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
    } catch {
      setError("Interview session not found.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmitAnswer() {
    if (!session || !answer.trim() || submitting) return;
    const question = session.questions[currentIdx];
    if (!question) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await careerApi.submitAnswer(sessionId, question.id, answer.trim());
      setFeedback(res.data);
      // Reload session to update has_answer status
      await load();
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!session) return;
    setCompleting(true);
    try {
      await careerApi.completeInterview(sessionId);
      await load();
    } catch {
      setError("Failed to complete interview.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (error && !session) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      <Link to="/interview" className="text-indigo-600 text-sm">← Back to interviews</Link>
    </div>
  );
  if (!session) return null;

  const question = session.questions[currentIdx];

  // ── Completed view ────────────────────────────────────────────────────────
  if (session.is_complete) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/interview" className="text-indigo-600 text-sm">← Back to interviews</Link>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">Completed</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Interview Complete</h1>
        <p className="text-gray-500 text-sm mb-6">
          {session.completed_questions} of {session.total_questions} questions answered.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Final Feedback</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {session.final_feedback}
          </p>
        </div>

        {/* Question review */}
        <div className="space-y-3">
          {session.questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700
                                 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{q.question}</p>
                  {q.has_answer && (
                    <span className="text-xs text-green-600 mt-1 inline-block">✓ Answered</span>
                  )}
                  {q.why_asked && (
                    <p className="text-xs text-gray-400 mt-2 italic">Why: {q.why_asked}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/interview")}
                className="mt-6 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          Start Another Interview
        </button>
      </div>
    );
  }

  // ── Active interview ──────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/interview" className="text-indigo-600 text-sm">← Exit interview</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {currentIdx + 1} / {session.total_questions}
          </span>
          <div className="w-32 bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                 style={{ width: `${session.progress_pct}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Current question */}
      {question && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white
                             flex items-center justify-center text-sm font-bold">
              {currentIdx + 1}
            </span>
            <div>
              <p className="text-base font-medium text-gray-800">{question.question}</p>
              <div className="flex items-center gap-2 mt-2">
                {question.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{question.category}</span>
                )}
                {question.difficulty && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">{question.difficulty}</span>
                )}
              </div>
            </div>
          </div>

          {/* "Why is this asked" expandable */}
          {question.why_asked && (
            <div className="bg-amber-50 rounded-lg p-3 mb-4 text-xs text-amber-800">
              <span className="font-semibold">Why interviewers ask this: </span>
              {question.why_asked}
            </div>
          )}
          {question.answer_guide && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-xs text-blue-800">
              <span className="font-semibold">Your answer should cover: </span>
              {question.answer_guide}
            </div>
          )}

          {/* Answer textarea */}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here…"
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200
                       mb-3"
          />
          <button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${!answer.trim() || submitting
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
            {submitting ? "Evaluating…" : question.has_answer ? "Re-answer" : "Submit Answer"}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="text-indigo-500">✨</span> AI Feedback
          </h3>

          {/* Overall feedback */}
          {feedback.feedback && (
            <p className="text-sm text-gray-700 leading-relaxed">{feedback.feedback}</p>
          )}

          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 mb-1">Strengths</p>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement areas */}
          {feedback.improvement_areas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-1">Areas for Improvement</p>
              <ul className="space-y-1">
                {feedback.improvement_areas.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-orange-500">△</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested answer */}
          {feedback.suggested_answer && (
            <div>
              <p className="text-xs font-semibold text-indigo-600 mb-1">Suggested Answer Structure</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-indigo-50 rounded-lg p-3">
                {feedback.suggested_answer}
              </p>
            </div>
          )}

          {/* Simple answer */}
          {feedback.simple_answer && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Simple English Version</p>
              <p className="text-sm text-gray-600 leading-relaxed">{feedback.simple_answer}</p>
            </div>
          )}

          {/* Next button */}
          <button
            onClick={() => { setFeedback(null); setAnswer(""); setCurrentIdx(currentIdx + 1); }}
            disabled={currentIdx + 1 >= session.total_questions}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${currentIdx + 1 >= session.total_questions
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            {currentIdx + 1 >= session.total_questions ? "Last question" : "Next Question →"}
          </button>
        </div>
      )}

      {/* Complete button */}
      <div className="mt-6 text-center">
        <button onClick={handleComplete} disabled={completing}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600
                           border border-gray-300 hover:bg-gray-50 transition-colors">
          {completing ? "Completing…" : "Complete Interview"}
        </button>
      </div>
    </div>
  );
}
