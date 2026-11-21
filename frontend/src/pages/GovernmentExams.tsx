/**
 * GovernmentExams — Exam category browser.
 *
 * Shows exam categories (SSC, Banking, Railway, UPSC, etc.) and
 * lets users drill into specific exams.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import examApi from "../services/examApi";
import type { ExamCategory, ExamListItem } from "../services/examApi";

export default function GovernmentExams() {
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [examsByCategory, setExamsByCategory] = useState<Record<string, ExamListItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await examApi.listCategories();
        setCategories(res.data);
        // Auto-expand first category with exams
        if (res.data.length > 0) setExpandedSlug(res.data[0].slug);
      } catch {
        setError("Failed to load exam categories.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleCategory(slug: string) {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug(slug);
    if (!examsByCategory[slug]) {
      try {
        const res = await examApi.listExamsByCategory(slug);
        setExamsByCategory((prev) => ({ ...prev, [slug]: res.data }));
      } catch {
        setError("Failed to load exams.");
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Government Exam Preparation</h1>
      <p className="text-gray-500 text-sm mb-6">
        Browse exams by category, access official notifications, syllabus, practice questions, and mock tests.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-gray-400 text-sm">
            No exam categories available yet. Ask your administrator to add exam data via Django admin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.slug)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || "📝"}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.exam_count} exam{cat.exam_count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <span className={`text-gray-400 transition-transform ${expandedSlug === cat.slug ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>

              {/* Exams in category */}
              {expandedSlug === cat.slug && (
                <div className="border-t border-gray-100">
                  {examsByCategory[cat.slug]?.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400">No exams in this category yet.</p>
                  ) : examsByCategory[cat.slug] ? (
                    <div className="divide-y divide-gray-50">
                      {examsByCategory[cat.slug].map((exam) => (
                        <Link
                          key={exam.id}
                          to={`/exams/${exam.id}`}
                          className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{exam.name}</p>
                            {exam.short_name && (
                              <p className="text-xs text-gray-400">{exam.short_name}</p>
                            )}
                          </div>
                          <span className="text-indigo-500 text-sm">View →</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4 text-sm text-gray-400">Loading exams…</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
