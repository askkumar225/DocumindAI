/**
 * Search.tsx — Semantic document search page.
 *
 * UI states:
 *   idle          — initial empty state with example queries
 *   searching     — loading spinner
 *   results       — ranked result cards with similarity bar
 *   empty         — searched but no results found
 *   error         — API / network / config error
 *   no-index      — user has no indexed documents yet
 *
 * Each result card shows:
 *   document name · document type · page reference (if known) · chunk index
 *   matched passage snippet · similarity bar
 *   "Open document" button → /documents/{id}
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  chunk_id:       number;
  document_id:    number;
  document_title: string;
  document_type:  string;
  chunk_index:    number;
  page_number:    number | null;
  content:        string;
  similarity:     number;
}

interface SearchResponse {
  query:         string;
  total_results: number;
  results:       SearchResult[];
}

// ─── Similarity bar ───────────────────────────────────────────────────────────

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100));
  const color =
    pct >= 70 ? "bg-emerald-500" :
    pct >= 45 ? "bg-yellow-400" :
                "bg-orange-400";
  const label =
    pct >= 70 ? "High match" :
    pct >= 45 ? "Medium match" :
                "Low match";
  const labelColor =
    pct >= 70 ? "bg-emerald-50 text-emerald-700" :
    pct >= 45 ? "bg-yellow-50 text-yellow-700" :
                "bg-orange-50 text-orange-600";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`}
             style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${labelColor}`}>
        {label}
      </span>
      <span className="text-xs text-gray-400 w-9 text-right font-mono">{pct}%</span>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

const DOC_TYPE_ICONS: Record<string, string> = {
  CONTRACT: "📝", INVOICE: "🧾", PURCHASE_ORDER: "📦",
  RECEIPT: "🧾", REPORT: "📊", POLICY: "📋",
  UNKNOWN: "📄", OTHER: "📄",
};

function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const navigate = useNavigate();
  const icon = DOC_TYPE_ICONS[result.document_type] ?? "📄";
  const snippet = result.content.length > 420
    ? result.content.slice(0, 420) + "…"
    : result.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5
                 hover:shadow-md hover:border-indigo-200 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-300 w-5 shrink-0 mt-0.5">
            #{rank}
          </span>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/documents/${result.document_id}`)}
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900
                         hover:underline text-left truncate block max-w-xs"
            >
              {icon} {result.document_title}
            </button>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5
                               rounded font-semibold uppercase">
                {result.document_type}
              </span>
              {result.page_number !== null && result.page_number !== undefined && (
                <span className="text-xs text-gray-400">Page {result.page_number}</span>
              )}
              <span className="text-[10px] text-gray-300 font-mono">
                chunk {result.chunk_index}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/documents/${result.document_id}`)}
          className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700
                     border border-indigo-200 hover:border-indigo-400
                     px-2.5 py-1 rounded-lg transition-colors font-medium"
        >
          Open →
        </button>
      </div>

      {/* Matched passage */}
      <blockquote className="text-sm text-gray-700 bg-gray-50 rounded-lg
                              px-4 py-3 border-l-4 border-indigo-200
                              leading-relaxed italic mb-3">
        "{snippet}"
      </blockquote>

      {/* Similarity bar */}
      <SimilarityBar score={result.similarity} />
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-5xl mb-3">🔎</div>
      <p className="font-semibold text-gray-600">No relevant results found</p>
      <p className="text-sm mt-1 max-w-sm mx-auto">
        No document passages matched <span className="italic">"{query}"</span> closely enough.
      </p>
      <div className="mt-4 text-xs text-gray-400 space-y-1 max-w-sm mx-auto">
        <p>Try rephrasing your question.</p>
        <p>Make sure documents have been fully processed (Status: READY).</p>
        <p>Semantic search requires a valid <code className="bg-gray-100 px-1 rounded">LLM_API_KEY</code>.</p>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
      <p className="text-sm font-semibold text-red-700 mb-1">Search failed</p>
      <p className="text-sm text-red-600 mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-lg
                   hover:bg-red-700 transition-colors font-medium"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Idle / initial state ─────────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  "What is the payment deadline?",
  "Who are the parties in this contract?",
  "What are the termination conditions?",
  "What is the total invoice amount?",
  "List all important dates",
  "What are the penalty clauses?",
];

function IdleState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div>
      <div className="text-center py-10 text-gray-400">
        <div className="text-6xl mb-4">💬</div>
        <p className="text-gray-500 font-medium">Ask a question about your documents</p>
        <p className="text-sm text-gray-400 mt-1">
          Semantic search finds meaning, not just exact words
        </p>
      </div>

      {/* Example queries */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide text-center">
          Try an example
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => onSelect(q)}
              className="text-xs border border-gray-200 bg-white text-gray-600
                         hover:border-indigo-300 hover:text-indigo-700
                         px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-indigo-800 mb-2">
          How semantic search works
        </h3>
        <div className="text-xs text-indigo-700 space-y-1.5">
          <p>1. Your question is converted into a numerical vector (embedding).</p>
          <p>2. DocuMind compares it against all your indexed document chunks.</p>
          <p>3. The most semantically similar passages are returned — even when the exact words differ.</p>
        </div>
        <div className="mt-3 pt-3 border-t border-indigo-100">
          <p className="text-[11px] text-indigo-500">
            <strong>Requirements:</strong> Documents must be fully processed (Status: READY)
            and a valid <code className="bg-indigo-100 px-1 rounded">LLM_API_KEY</code> must
            be configured in <code className="bg-indigo-100 px-1 rounded">backend/.env</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main search page ─────────────────────────────────────────────────────────

export default function Search() {
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await api.post<SearchResponse>("/search/", { query: q.trim() });
      setResponse(res.data);
      setSearched(true);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      const serverMsg = e.response?.data?.error;
      const httpStatus = e.response?.status;

      if (httpStatus === 403) {
        setError("You don't have permission to search that document.");
      } else if (httpStatus === 429) {
        setError("The search service is temporarily busy. Please try again in a moment.");
      } else if (httpStatus === 400) {
        setError(serverMsg ?? "Invalid search request.");
      } else if (serverMsg) {
        setError(serverMsg);
      } else {
        setError("Search failed. Make sure documents are uploaded and fully processed.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  function handleSelectExample(q: string) {
    setQuery(q);
    runSearch(q);
  }

  function handleRetry() {
    setError(null);
    runSearch(query);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Ask a question in plain English — DocuMind searches by meaning, not just keywords.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What is the payment deadline?"
              autoFocus
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl
                         text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400
                         focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium
                       text-sm hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="30" strokeDashoffset="10"/>
                </svg>
                Searching…
              </span>
            ) : "Search"}
          </button>
        </div>
      </form>

      {/* Dynamic content area */}
      <AnimatePresence mode="wait">

        {/* Error */}
        {error && !loading && (
          <motion.div key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorState message={error} onRetry={handleRetry} />
          </motion.div>
        )}

        {/* Results */}
        {!error && !loading && response && (
          <motion.div key="results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Summary */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{response.total_results}</span>{" "}
                result{response.total_results !== 1 ? "s" : ""} for{" "}
                <span className="italic text-gray-800">"{response.query}"</span>
              </p>
              <button
                onClick={() => { setResponse(null); setSearched(false); setQuery(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>

            {response.results.length === 0
              ? <EmptyState query={response.query} />
              : (
                <div className="space-y-4">
                  {response.results.map((r, i) => (
                    <ResultCard key={r.chunk_id} result={r} rank={i + 1} />
                  ))}
                </div>
              )
            }
          </motion.div>
        )}

        {/* Idle */}
        {!error && !loading && !response && (
          <motion.div key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IdleState onSelect={handleSelectExample} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
