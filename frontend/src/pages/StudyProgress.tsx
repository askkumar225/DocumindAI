/**
 * StudyProgress — Overall study progress across government exams.
 *
 * Shows progress stats and links to individual exam progress.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import examApi from "../services/examApi";
import type { StudyProgress as ProgressData } from "../services/examApi";

export default function StudyProgress() {
  const [progressMap, setProgressMap] = useState<Record<number, ProgressData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await examApi.listCategories();

        // Load progress for each category's exams
        const allProgress: Record<number, ProgressData> = {};
        for (const cat of catRes.data) {
          if (cat.exam_count === 0) continue;
          try {
            const examsRes = await examApi.listExamsByCategory(cat.slug);
            for (const exam of examsRes.data) {
              try {
                const p = await examApi.getProgress(exam.id);
                if (p.data.questions_attempted > 0 || p.data.mock_tests_taken > 0) {
                  allProgress[exam.id] = p.data;
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
        }
        setProgressMap(allProgress);
      } catch {
        setError("Failed to load progress.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const examIds = Object.keys(progressMap).map(Number);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading progress…</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Study Progress</h1>
      <p className="text-gray-500 text-sm mb-6">
        Track your practice questions, accuracy, mock tests, and study streak across government exams.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {examIds.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📈</div>
          <p className="text-gray-400 text-sm mb-4">
            No study activity yet. Start practicing to see your progress here.
          </p>
          <Link to="/exams" className="text-indigo-600 text-sm font-medium hover:underline">
            Browse Exams →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {examIds.map((examId) => {
            const p = progressMap[examId];
            return (
              <Link key={examId} to={`/exams/${examId}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 block
                               hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">{p.exam_name}</h3>
                  <span className="text-indigo-500 text-xs">View Details →</span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-700">{p.questions_attempted}</p>
                    <p className="text-xs text-gray-400">Attempted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{p.questions_correct}</p>
                    <p className="text-xs text-gray-400">Correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-indigo-600">{p.accuracy}%</p>
                    <p className="text-xs text-gray-400">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">{p.mock_tests_taken}</p>
                    <p className="text-xs text-gray-400">Mock Tests</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Study Streak</span>
                    <span className="text-xs font-semibold text-orange-500">🔥 {p.study_streak} days</span>
                  </div>
                  {p.weak_topics.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Weak Topics:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.weak_topics.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
