/**
 * Comparisons — Select documents and create a cross-document comparison.
 * Also shows the list of previous comparisons.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { DocumentListItem, DocumentComparisonListItem } from "../types/document";

// ─── Severity badge ───────────────────────────────────────────────────────────

function StatusChip({ status, overall }: {
  status: string;
  overall?: string;
}) {
  if (status === "PROCESSING" || status === "PENDING") {
    return <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full animate-pulse font-medium">Processing…</span>;
  }
  if (status === "FAILED") {
    return <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">Failed</span>;
  }
  if (status === "COMPLETED") {
    if (overall === "ALL_MATCH") {
      return <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">✓ All Match</span>;
    }
    return <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">⚠ Mismatches Found</span>;
  }
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{status}</span>;
}

function docIcon(type: string) {
  const m: Record<string, string> = { CONTRACT: "📝", INVOICE: "🧾", PURCHASE_ORDER: "📦", REPORT: "📊", POLICY: "📋" };
  return m[type] ?? "📄";
}

export default function Comparisons() {
  const navigate = useNavigate();

  const [documents,    setDocuments]    = useState<DocumentListItem[]>([]);
  const [comparisons,  setComparisons]  = useState<DocumentComparisonListItem[]>([]);
  const [selected,     setSelected]     = useState<number[]>([]);
  const [title,        setTitle]        = useState("");
  const [creating,     setCreating]     = useState(false);
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [docsRes, compsRes] = await Promise.all([
        api.get<DocumentListItem[]>("/documents/"),
        api.get<DocumentComparisonListItem[]>("/comparisons/"),
      ]);
      setDocuments(docsRes.data.filter(d =>
        d.status === "PROCESSED" || d.status === "APPROVED" ||
        d.status === "PENDING_APPROVAL" || d.status === "REVIEWED"
      ));
      setComparisons(compsRes.data);
    } catch {
      setError("Could not load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }

  function toggleDoc(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  async function createComparison() {
    if (selected.length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<{ id: number }>("/comparisons/", {
        document_ids: selected,
        title: title.trim() || `Comparison — ${new Date().toLocaleDateString()}`,
      });
      navigate(`/comparisons/${res.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to create comparison.");
      setCreating(false);
    }
  }

  const canCompare = selected.length >= 2 && !creating;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Comparison</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select 2 or more processed documents to detect mismatches, inconsistencies, and duplicates.
        </p>
      </div>

      {/* ── Document selector ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Select Documents to Compare</h2>

        {loadingDocs && <p className="text-sm text-gray-400">Loading documents…</p>}

        {!loadingDocs && documents.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">📄</p>
            <p className="text-sm">No processed documents yet.</p>
            <button onClick={() => navigate("/upload")}
              className="mt-3 text-indigo-600 text-sm hover:underline">Upload a document →</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map(doc => {
            const isSelected = selected.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left
                            transition-all duration-150
                            ${isSelected
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <span className="text-xl mt-0.5">{docIcon(doc.document_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.document_type}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center
                                  justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <p className="text-sm text-gray-600 font-medium">
              {selected.length} document{selected.length !== 1 ? "s" : ""} selected
            </p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Comparison title (optional)"
              className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-4">
          <button
            onClick={createComparison}
            disabled={!canCompare}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm
                       hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {creating ? "Creating comparison…" : "Compare Documents"}
          </button>
          {selected.length < 2 && selected.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">Select at least 2 documents to compare.</p>
          )}
        </div>
      </div>

      {/* ── Previous comparisons ──────────────────────────────────────────── */}
      {comparisons.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Previous Comparisons</h2>
          <div className="space-y-2">
            {comparisons.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/comparisons/${c.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl
                           border border-gray-200 hover:shadow-md hover:border-indigo-200
                           transition-all text-left"
              >
                <span className="text-2xl">🔀</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.doc_count} documents · {c.mismatch_count} mismatches ·{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusChip status={c.status} overall={c.overall_status} />
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
