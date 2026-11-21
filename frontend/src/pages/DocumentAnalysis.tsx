/**
 * DocumentAnalysis — Full document detail + deep AI analysis page.
 *
 * Sections:
 *   1. Header (title, status, badges)
 *   2. AI Summary + confidence
 *   3. Key Information
 *   4. Important Dates
 *   5. Financial Amounts
 *   6. Entities (parties)
 *   7. Potential Risks (with severity)
 *   8. Inconsistencies
 *   9. Missing Information
 *  10. Extracted Fields (from AIAnalysis)
 *  11. Extracted Text (collapsible)
 *  12. Ask AI (inline mini chat)
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import type {
  Document, DocumentDeepAnalysis, RiskLevel,
  RiskItem, InconsistencyItem, MissingInfoItem,
  DateItem, AmountItem, KeyInfoItem,
} from "../types/document";
import { StatusBadge, AIStatusBadge } from "../components/StatusBadge";
import { AIAnalysisCard } from "../components/AIAnalysisCard";

const POLL_MS = 3000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStillProcessing(doc: Document, deep: DocumentDeepAnalysis | null): boolean {
  return (
    doc.status === "UPLOADED" ||
    doc.status === "PROCESSING" ||
    doc.status === "ANALYZING" ||
    doc.status === "EMBEDDING" ||
    (doc.ai_analysis?.ai_status === "PENDING") ||
    (doc.ai_analysis?.ai_status === "PROCESSING") ||
    deep?.status === "PENDING" ||
    deep?.status === "PROCESSING"
  );
}

const SEVERITY_CONFIG: Record<RiskLevel, { dot: string; bg: string; text: string; label: string }> = {
  CRITICAL: { dot: "🔴", bg: "bg-red-50 border-red-200",    text: "text-red-700",    label: "Critical" },
  HIGH:     { dot: "🟠", bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "High" },
  MEDIUM:   { dot: "🟡", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Medium" },
  LOW:      { dot: "🔵", bg: "bg-blue-50 border-blue-200",   text: "text-blue-700",   label: "Low" },
};

function SeverityBadge({ level }: { level: RiskLevel }) {
  const cfg = SEVERITY_CONFIG[level] ?? SEVERITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
      {cfg.dot} {cfg.label}
    </span>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children, count }: {
  title: string; icon: string; children: React.ReactNode; count?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className="ml-auto text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Inline mini chat ──────────────────────────────────────────────────────────

function InlineChat({ documentId }: { documentId: number }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [convId, setConvId]     = useState<number | null>(null);

  async function ask() {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setLoading(true);
    setAnswer("");
    try {
      const res = await api.post<{ answer: string; conversation_id: number }>("/chat/", {
        question: q,
        conversation_id: convId,
        document_ids: [documentId],
      });
      setAnswer(res.data.answer);
      setConvId(res.data.conversation_id);
    } catch {
      setAnswer("Failed to get answer. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-indigo-800 text-sm">Ask DocuMind AI</h3>
        <Link to="/chat" className="ml-auto text-xs text-indigo-500 hover:underline">
          Open full chat →
        </Link>
      </div>

      {answer && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-indigo-200 text-sm text-gray-800 leading-relaxed">
          {answer}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Ask anything about this document…"
          className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <button
          onClick={ask}
          disabled={!question.trim() || loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors font-medium"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {["Summarize this document", "What are the key risks?", "What are the payment terms?", "List all important dates"].map(q => (
          <button
            key={q}
            onClick={() => { setQuestion(q); }}
            className="text-xs text-indigo-600 border border-indigo-200 bg-white
                       hover:bg-indigo-50 px-2.5 py-1 rounded-full transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Risk panel ────────────────────────────────────────────────────────────────

function RisksPanel({ risks }: { risks: RiskItem[] }) {
  if (!risks.length) return <p className="text-sm text-gray-400 text-center py-3">No risks detected.</p>;
  return (
    <div className="space-y-3">
      {risks.map((r, i) => {
        const cfg = SEVERITY_CONFIG[r.severity] ?? SEVERITY_CONFIG.LOW;
        return (
          <div key={i} className={`border rounded-lg p-4 ${cfg.bg}`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.dot} {r.title}</p>
              <SeverityBadge level={r.severity} />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{r.description}</p>
            {r.source_text && (
              <blockquote className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">
                "{r.source_text.slice(0, 200)}{r.source_text.length > 200 ? "…" : ""}"
              </blockquote>
            )}
            {r.page && (
              <p className="text-xs text-gray-400 mt-1">Page {r.page}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Inconsistencies panel ─────────────────────────────────────────────────────

function InconsistenciesPanel({ items }: { items: InconsistencyItem[] }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-3">No inconsistencies detected.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-semibold text-orange-800">⚠ {item.issue}</p>
            <SeverityBadge level={item.severity} />
          </div>
          <p className="text-sm text-gray-700">{item.description}</p>
          {item.locations?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.locations.map((loc, j) => (
                <span key={j} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{loc}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Missing info panel ────────────────────────────────────────────────────────

function MissingInfoPanel({ items }: { items: MissingInfoItem[] }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-3">No missing information detected.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <SeverityBadge level={item.severity} />
          <div>
            <p className="text-sm font-medium text-gray-800">{item.issue}</p>
            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dates panel ───────────────────────────────────────────────────────────────

function DatesPanel({ dates }: { dates: DateItem[] }) {
  if (!dates.length) return <p className="text-sm text-gray-400 text-center py-3">No important dates found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {dates.map((d, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <span className="text-lg">📅</span>
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{d.name}</p>
            <p className="text-sm font-bold text-gray-800">{d.value ?? "—"}</p>
            {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
            {d.page && <p className="text-xs text-gray-400">Page {d.page}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Amounts panel ─────────────────────────────────────────────────────────────

function AmountsPanel({ amounts }: { amounts: AmountItem[] }) {
  if (!amounts.length) return <p className="text-sm text-gray-400 text-center py-3">No financial amounts found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {amounts.map((a, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <span className="text-lg">💰</span>
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{a.name}</p>
            <p className="text-sm font-bold text-gray-800">
              {a.currency && a.currency !== "null" ? `${a.currency} ` : ""}
              {a.value !== null && a.value !== undefined ? Number(a.value).toLocaleString() : "—"}
            </p>
            {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
            {a.page && <p className="text-xs text-gray-400">Page {a.page}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Key information panel ─────────────────────────────────────────────────────

function KeyInfoPanel({ items }: { items: KeyInfoItem[] }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-3">No key information extracted.</p>;
  return (
    <div className="divide-y divide-gray-50">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <span className="text-sm text-gray-500 w-44 shrink-0 font-medium">{item.label}</span>
          <span className="text-sm text-gray-800 flex-1">{item.value}</span>
          {item.page && <span className="text-xs text-gray-400 shrink-0">p.{item.page}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Overall risk banner ───────────────────────────────────────────────────────

function RiskBanner({ level }: { level: RiskLevel }) {
  const cfg = SEVERITY_CONFIG[level] ?? SEVERITY_CONFIG.LOW;
  if (level === "LOW") return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.text}`}>
      <span className="text-xl">{cfg.dot}</span>
      <div>
        <p className="font-semibold text-sm">Overall Risk: {cfg.label}</p>
        <p className="text-xs opacity-80">This document requires careful review before approval.</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc,  setDoc]   = useState<Document | null>(null);
  const [deep, setDeep]  = useState<DocumentDeepAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAll() {
    try {
      const [docRes, deepRes] = await Promise.allSettled([
        api.get<Document>(`/documents/${id}/`),
        api.get<DocumentDeepAnalysis & { document_id: number }>(`/documents/${id}/deep_analysis/`),
      ]);

      if (docRes.status === "fulfilled") { setDoc(docRes.value.data); setError(null); }
      else { setError("Could not load document."); }

      if (deepRes.status === "fulfilled") setDeep(deepRes.value.data);
      // deep analysis may not exist yet — that's fine
    } catch {
      setError("Could not load document.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (!doc) return;
    const stillProcessing = isStillProcessing(doc, deep);
    if (stillProcessing && !pollRef.current) {
      pollRef.current = setInterval(fetchAll, POLL_MS);
    }
    if (!stillProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [doc, deep]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center text-gray-400 py-20">
        Loading document…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-red-400 py-10">{error ?? "Document not found."}</p>
        <button onClick={() => navigate(-1)} className="text-indigo-500 hover:underline text-sm">
          ← Go back
        </button>
      </div>
    );
  }

  const ai = doc.ai_analysis;
  const stillProcessing = isStillProcessing(doc, deep);
  const isFailed = doc.status === "FAILED";

  // ── Processing step label ─────────────────────────────────────────────────
  const processingLabel =
    doc.status === "ANALYZING"  ? "🤖 AI is analyzing…" :
    doc.status === "EMBEDDING"  ? "⚡ Generating embeddings…" :
    doc.status === "PROCESSING" ? "📄 Extracting text…" :
    doc.status === "UPLOADED"   ? "⏳ Queued for processing…" :
    "● Processing…";

  // ── Retry handler ─────────────────────────────────────────────────────────
  async function handleRetry() {
    try {
      await api.post(`/documents/${id}/retry/`);
      fetchAll();
    } catch {
      alert("Retry failed. Please try again.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-indigo-500 hover:underline mb-3 inline-flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Uploaded {new Date(doc.created_at).toLocaleString()} ·{" "}
              <span className="font-medium text-indigo-600">{doc.document_type}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={doc.status} pulse />
            {ai && <AIStatusBadge status={ai.ai_status} />}
            {deep?.status === "COMPLETED" && (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200
                               px-2 py-0.5 rounded-full font-semibold">✓ Deep Analysis</span>
            )}
            {stillProcessing && (
              <span className="text-xs text-yellow-600 animate-pulse">
                {processingLabel}
              </span>
            )}
            {isFailed && (
              <button
                onClick={handleRetry}
                className="text-xs bg-red-50 text-red-700 border border-red-200
                           px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors
                           font-medium flex items-center gap-1"
              >
                ↺ Retry Processing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Overall risk banner ───────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.overall_risk_level && deep.overall_risk_level !== "LOW" && (
        <RiskBanner level={deep.overall_risk_level} />
      )}

      {/* ── AI Summary ────────────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.summary && (
        <Section title="AI Summary" icon="🤖">
          <p className="text-sm text-gray-700 leading-relaxed">{deep.summary}</p>
          {deep.confidence_score > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-xs text-gray-400">Confidence</p>
              <div className="flex-1 max-w-xs bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${deep.confidence_score >= 0.85 ? "bg-emerald-500" : deep.confidence_score >= 0.65 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${Math.round(deep.confidence_score * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">{Math.round(deep.confidence_score * 100)}%</span>
            </div>
          )}
        </Section>
      )}

      {/* ── Key Information ───────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.key_information?.length > 0 && (
        <Section title="Key Information" icon="📋" count={deep.key_information.length}>
          <KeyInfoPanel items={deep.key_information} />
        </Section>
      )}

      {/* ── Important Dates ───────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.important_dates?.length > 0 && (
        <Section title="Important Dates" icon="📅" count={deep.important_dates.length}>
          <DatesPanel dates={deep.important_dates} />
        </Section>
      )}

      {/* ── Financial Amounts ─────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.amounts?.length > 0 && (
        <Section title="Financial Amounts" icon="💰" count={deep.amounts.length}>
          <AmountsPanel amounts={deep.amounts} />
        </Section>
      )}

      {/* ── Entities / Parties ────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.entities?.length > 0 && (
        <Section title="Entities & Parties" icon="🏢" count={deep.entities.length}>
          <div className="flex flex-wrap gap-2">
            {deep.entities.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200
                                       rounded-full px-3 py-1">
                <span className="text-xs text-gray-400 uppercase font-semibold">{e.type}</span>
                <span className="text-sm font-medium text-gray-800">{e.name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Potential Risks ───────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && (
        <Section title="Potential Issues" icon="⚠️" count={deep.risks?.length ?? 0}>
          <RisksPanel risks={deep.risks ?? []} />
        </Section>
      )}

      {/* ── Inconsistencies ───────────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.inconsistencies?.length > 0 && (
        <Section title="Inconsistencies Detected" icon="🔍" count={deep.inconsistencies.length}>
          <InconsistenciesPanel items={deep.inconsistencies} />
        </Section>
      )}

      {/* ── Missing Information ───────────────────────────────────────────── */}
      {deep?.status === "COMPLETED" && deep.missing_information?.length > 0 && (
        <Section title="Missing Information" icon="❓" count={deep.missing_information.length}>
          <MissingInfoPanel items={deep.missing_information} />
        </Section>
      )}

      {/* ── Deep analysis processing ──────────────────────────────────────── */}
      {(!deep || deep.status === "PENDING" || deep.status === "PROCESSING") && doc.status === "PROCESSED" && (
        <Section title="Deep AI Analysis" icon="🔄">
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm animate-pulse">Running comprehensive analysis…</p>
            <p className="text-xs mt-1 text-gray-300">This page updates automatically.</p>
          </div>
        </Section>
      )}

      {/* ── Standard AI Analysis (fallback if no deep analysis) ──────────── */}
      {ai?.ai_status === "COMPLETED" && !deep?.summary && (
        <AIAnalysisCard analysis={ai} />
      )}

      {/* ── Extracted Text ────────────────────────────────────────────────── */}
      {doc.extracted_content && <ExtractedTextSection doc={doc} />}

      {/* ── Ask AI ────────────────────────────────────────────────────────── */}
      {(doc.status === "PROCESSED" || doc.status === "APPROVED" || doc.status === "PENDING_APPROVAL") && (
        <InlineChat documentId={doc.id} />
      )}
    </div>
  );
}

// ─── Extracted text section (collapsible) ────────────────────────────────────

function ExtractedTextSection({ doc }: { doc: Document }) {
  const [expanded, setExpanded] = useState(false);
  const content = doc.extracted_content;
  if (!content) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📄</span>
        <h2 className="text-base font-semibold text-gray-800">Extracted Text</h2>
        <span className="ml-auto text-xs text-gray-400">
          {content.text.length.toLocaleString()} chars · {content.page_count} pages · {content.extraction_method}
        </span>
      </div>
      <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words
                      bg-gray-50 rounded-lg p-4 leading-relaxed max-h-64 overflow-y-auto">
        {expanded ? content.text : content.text.slice(0, 600)}
        {!expanded && content.text.length > 600 && "…"}
      </pre>
      {content.text.length > 600 && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-indigo-500 hover:underline">
          {expanded ? "Show less" : `Show all ${content.text.length.toLocaleString()} characters`}
        </button>
      )}
    </div>
  );
}
