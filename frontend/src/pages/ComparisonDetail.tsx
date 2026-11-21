/**
 * ComparisonDetail — Full comparison results page.
 * Shows: summary banner, document list, comparison table, mismatch cards.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type {
  DocumentComparison, ComparisonResult, RiskLevel,
} from "../types/document";

const POLL_MS = 3000;

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEV: Record<string, { dot: string; text: string; bg: string }> = {
  CRITICAL: { dot: "🔴", text: "text-red-700",    bg: "bg-red-50 border-red-200" },
  HIGH:     { dot: "🟠", text: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  MEDIUM:   { dot: "🟡", text: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  LOW:      { dot: "🔵", text: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
  "":       { dot: "⚪", text: "text-gray-500",   bg: "bg-gray-50 border-gray-100" },
};

function SeverityBadge({ level }: { level: string }) {
  const cfg = SEV[level] ?? SEV[""];
  if (!level) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5
                      rounded-full border ${cfg.bg} ${cfg.text}`}>
      {cfg.dot} {level}
    </span>
  );
}

// ─── Status cell ─────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: ComparisonResult["status"] }) {
  if (status === "MATCH") {
    return <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">✓ Match</span>;
  }
  if (status === "MISMATCH") {
    return <span className="text-xs font-semibold text-red-600 flex items-center gap-1">⚠ Mismatch</span>;
  }
  return <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">— Missing</span>;
}

// ─── Mismatch card ────────────────────────────────────────────────────────────

function MismatchCard({ result }: { result: ComparisonResult }) {
  const cfg = SEV[result.severity] ?? SEV[""];
  return (
    <div className={`border rounded-xl p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className={`text-sm font-semibold ${cfg.text}`}>
            {cfg.dot} {result.field_name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </p>
          {result.mismatch_type && (
            <span className="text-xs text-gray-500">{result.mismatch_type.replace(/_/g, " ")}</span>
          )}
        </div>
        <SeverityBadge level={result.severity} />
      </div>

      {result.explanation && (
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{result.explanation}</p>
      )}

      {/* Value comparison table */}
      {Object.keys(result.document_values).length > 0 && (
        <div className="space-y-1.5">
          {Object.entries(result.document_values).map(([docTitle, value]) => (
            <div key={docTitle} className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-gray-500 truncate w-40">📄 {docTitle}</span>
              <span className="text-sm font-semibold text-gray-800 flex-1">
                {value ?? <span className="text-gray-400 italic">not found</span>}
              </span>
              {result.page_references?.[docTitle] && (
                <span className="text-xs text-gray-400 shrink-0">p.{result.page_references[docTitle]}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary banner ───────────────────────────────────────────────────────────

function SummaryBanner({ comparison }: { comparison: DocumentComparison }) {
  const isMatch = comparison.overall_status === "ALL_MATCH";
  return (
    <div className={`rounded-xl border p-5 ${isMatch
      ? "bg-emerald-50 border-emerald-200"
      : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{isMatch ? "✅" : "⚠️"}</span>
        <div>
          <p className={`font-bold text-base ${isMatch ? "text-emerald-800" : "text-amber-800"}`}>
            {isMatch ? "All Fields Match" : "Mismatches Found"}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {comparison.comparison_documents.length} documents compared ·{" "}
            <span className="text-emerald-700 font-medium">✓ {comparison.match_count} matched</span>
            {comparison.mismatch_count > 0 && (
              <> · <span className="text-red-600 font-medium">⚠ {comparison.mismatch_count} issues</span></>
            )}
          </p>
        </div>
      </div>
      {comparison.summary && (
        <p className="text-sm text-gray-700 leading-relaxed">{comparison.summary}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparisonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<DocumentComparison | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchComparison() {
    try {
      const res = await api.get<DocumentComparison>(`/comparisons/${id}/`);
      setComparison(res.data);
      setError(null);
    } catch {
      setError("Could not load comparison.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchComparison(); }, [id]);

  useEffect(() => {
    if (!comparison) return;
    const pending = comparison.status === "PENDING" || comparison.status === "PROCESSING";
    if (pending && !pollRef.current) {
      pollRef.current = setInterval(fetchComparison, POLL_MS);
    }
    if (!pending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [comparison]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-10 text-center text-gray-400">Loading…</div>;
  }
  if (error || !comparison) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-red-400">{error ?? "Not found."}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-500 hover:underline text-sm">← Back</button>
      </div>
    );
  }

  const isProcessing = comparison.status === "PENDING" || comparison.status === "PROCESSING";
  const mismatches   = comparison.results.filter(r => r.status !== "MATCH");
  const matches      = comparison.results.filter(r => r.status === "MATCH");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)}
          className="text-sm text-indigo-500 hover:underline mb-3 inline-flex items-center gap-1">
          ← Back to Comparisons
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{comparison.title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Created {new Date(comparison.created_at).toLocaleDateString()}
              {comparison.completed_at && ` · Completed ${new Date(comparison.completed_at).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="text-xs text-yellow-600 animate-pulse bg-yellow-50 border
                               border-yellow-200 px-2 py-1 rounded-full">● Running…</span>
            )}
            {comparison.status === "FAILED" && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                ✗ Failed
              </span>
            )}
            <button
              onClick={async () => {
                await api.post(`/comparisons/${id}/run/`);
                fetchComparison();
              }}
              className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5
                         rounded-lg hover:bg-indigo-50 transition-colors"
            >
              ↺ Re-run
            </button>
          </div>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex flex-wrap gap-2">
        {comparison.comparison_documents.map(cd => (
          <button
            key={cd.id}
            onClick={() => navigate(`/documents/${cd.document}`)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-full
                       px-3 py-1.5 text-sm hover:border-indigo-300 hover:text-indigo-700
                       transition-colors"
          >
            <span>📄</span>
            <span className="font-medium">{cd.document_title}</span>
            <span className="text-gray-400 text-xs">({cd.document_type})</span>
          </button>
        ))}
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <p className="text-3xl mb-3 animate-spin inline-block">⚙</p>
          <p className="text-sm animate-pulse">Comparing documents…</p>
          <p className="text-xs text-gray-300 mt-1">This page updates automatically.</p>
        </div>
      )}

      {/* Summary banner */}
      {comparison.status === "COMPLETED" && <SummaryBanner comparison={comparison} />}

      {/* Issues / Mismatches */}
      {mismatches.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            ⚠ Issues Found
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{mismatches.length}</span>
          </h2>
          <div className="space-y-3">
            {mismatches.map((r, i) => <MismatchCard key={i} result={r} />)}
          </div>
        </div>
      )}

      {/* Comparison table — all fields */}
      {comparison.results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Field Comparison</h2>
            <span className="text-xs text-gray-400">{comparison.results.length} fields</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Field</th>
                  {comparison.comparison_documents.map(cd => (
                    <th key={cd.id} className="px-4 py-3 text-left truncate max-w-[140px]">
                      {cd.document_title}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {comparison.results.map((r, i) => (
                  <tr key={i} className={r.status !== "MATCH" ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-700 capitalize whitespace-nowrap">
                      {r.field_name.replace(/_/g, " ")}
                    </td>
                    {comparison.comparison_documents.map(cd => (
                      <td key={cd.id} className="px-4 py-3 text-gray-800 max-w-[140px] truncate">
                        {r.document_values[cd.document_title] ?? <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusCell status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
