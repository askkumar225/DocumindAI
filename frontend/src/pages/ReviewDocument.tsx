/**
 * ReviewDocument — Full review workspace for a single approval request.
 *
 * Shows:
 *   - Document overview (type, uploaded by, date)
 *   - AI Summary
 *   - Potential Risks (from deep analysis)
 *   - Inconsistencies
 *   - Missing Information
 *   - Source evidence
 *   - Review checklist
 *   - Reviewer comments
 *   - Approve / Reject / Request Changes buttons
 *   - Activity timeline (audit log)
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../store/authStore";
import type {
  ApprovalRequest, Document, DocumentDeepAnalysis, RiskItem, RiskLevel,
} from "../types/document";
import { StatusBadge } from "../components/StatusBadge";

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_CFG: Record<RiskLevel, { dot: string; bg: string; text: string }> = {
  CRITICAL: { dot: "🔴", bg: "bg-red-50 border-red-200",     text: "text-red-700"    },
  HIGH:     { dot: "🟠", bg: "bg-orange-50 border-orange-200",text: "text-orange-700" },
  MEDIUM:   { dot: "🟡", bg: "bg-yellow-50 border-yellow-200",text: "text-yellow-700" },
  LOW:      { dot: "🔵", bg: "bg-blue-50 border-blue-100",   text: "text-blue-700"   },
};

function RiskCard({ risk }: { risk: RiskItem }) {
  const cfg = SEV_CFG[risk.severity] ?? SEV_CFG.LOW;
  return (
    <div className={`border rounded-lg p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.dot} {risk.title}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
          {risk.severity}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{risk.description}</p>
      {risk.source_text && (
        <blockquote className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">
          "{risk.source_text.slice(0, 200)}"
        </blockquote>
      )}
      {risk.page && <p className="text-xs text-gray-400 mt-1">Page {risk.page}</p>}
    </div>
  );
}

// ─── Checklist ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  "Document type is correct",
  "Parties / names are correct",
  "Dates are correct",
  "Amounts are correct",
  "Required information is present",
  "AI risks reviewed",
  "Inconsistencies reviewed",
  "Supporting documents checked",
  "Final decision confirmed",
];

function ReviewChecklist({
  checked, onChange,
}: {
  checked: Set<number>;
  onChange: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      {CHECKLIST_ITEMS.map((item, i) => (
        <label
          key={i}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div
            onClick={() => onChange(i)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center
                        flex-shrink-0 transition-colors cursor-pointer
                        ${checked.has(i)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 group-hover:border-indigo-400"}`}
          >
            {checked.has(i) && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4l1.5 1.5L6.5 2" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className={`text-sm ${checked.has(i) ? "line-through text-gray-400" : "text-gray-700"}`}>
            {item}
          </span>
        </label>
      ))}
      <p className="text-xs text-gray-400 mt-2">
        {checked.size}/{CHECKLIST_ITEMS.length} items reviewed
      </p>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: {
  title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReviewDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [doc,      setDoc]      = useState<Document | null>(null);
  const [deep,     setDeep]     = useState<DocumentDeepAnalysis | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [comments,  setComments]  = useState("");
  const [checklist, setChecklist] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<"approve" | "reject" | "changes" | null>(null);
  const [actionDone, setActionDone] = useState(false);
  const [actionMsg,  setActionMsg]  = useState("");

  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";
  const isReviewer = isManager && approval?.reviewer === user?.id;
  const canAct = isReviewer || user?.role === "ADMIN";

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    try {
      const approvalRes = await api.get<ApprovalRequest>(`/workflows/approvals/${id}/`);
      setApproval(approvalRes.data);

      const docId = approvalRes.data.document;
      const [docRes, deepRes] = await Promise.allSettled([
        api.get<Document>(`/documents/${docId}/`),
        api.get<DocumentDeepAnalysis & { document_id: number }>(`/documents/${docId}/deep_analysis/`),
      ]);

      if (docRes.status === "fulfilled") setDoc(docRes.value.data);
      if (deepRes.status === "fulfilled") setDeep(deepRes.value.data);
    } catch {
      setError("Could not load review details.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(i: number) {
    setChecklist(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function doAction(action: "approve" | "reject" | "changes") {
    if (!approval) return;
    setSubmitting(action);
    const url = action === "approve"  ? `/workflows/approvals/${id}/approve/`
              : action === "reject"   ? `/workflows/approvals/${id}/reject/`
              :                         `/workflows/approvals/${id}/request_changes/`;
    try {
      await api.post(url, { comments });
      setActionDone(true);
      setActionMsg(
        action === "approve"  ? "✓ Document approved successfully."
        : action === "reject" ? "Document rejected."
        :                       "Changes requested. The submitter will be notified."
      );
      fetchAll();
    } catch {
      setActionMsg("Action failed. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-10 text-center text-gray-400">Loading…</div>;
  }
  if (error || !approval) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-red-400">{error ?? "Not found."}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-500 hover:underline text-sm">← Back</button>
      </div>
    );
  }

  const ai         = doc?.ai_analysis;
  const hasRisks   = (deep?.risks?.length ?? 0) > 0;
  const hasIssues  = (deep?.inconsistencies?.length ?? 0) + (deep?.missing_information?.length ?? 0) > 0;
  const isPending  = approval.status === "PENDING";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)}
          className="text-sm text-indigo-500 hover:underline mb-3 inline-flex items-center gap-1">
          ← Review Center
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {approval.document_title}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Submitted by <span className="font-medium text-gray-600">
                {approval.requested_by_detail?.username}
              </span> · {new Date(approval.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={approval.document_status} />
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
              ${approval.priority === "URGENT" ? "bg-red-50 text-red-700 border-red-200"
              : approval.priority === "HIGH"   ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {approval.priority}
            </span>
            {approval.status !== "PENDING" && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
                ${approval.status === "APPROVED"      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : approval.status === "REJECTED"      ? "bg-red-50 text-red-700 border-red-200"
                : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                {approval.status.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action done banner */}
      {actionMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium
          ${actionDone && approval.status === "APPROVED"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-gray-50 text-gray-700 border border-gray-200"}`}>
          {actionMsg}
        </div>
      )}

      {/* Document overview */}
      <Section title="Document Overview" icon="📄">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Type</p>
            <p className="font-medium text-indigo-700">{doc?.document_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Status</p>
            <p className="font-medium">{approval.document_status.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Risk Level</p>
            <p className="font-medium">
              {deep?.overall_risk_level
                ? <span className={
                    deep.overall_risk_level === "CRITICAL" ? "text-red-600 font-bold"
                    : deep.overall_risk_level === "HIGH"   ? "text-orange-600 font-bold"
                    : deep.overall_risk_level === "MEDIUM" ? "text-yellow-600"
                    : "text-emerald-600"
                  }>{deep.overall_risk_level}</span>
                : "—"}
            </p>
          </div>
          {approval.due_date && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Due</p>
              <p className="font-medium">{new Date(approval.due_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-3">
          <Link
            to={`/documents/${approval.document}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            View full document →
          </Link>
        </div>
      </Section>

      {/* AI Summary */}
      {(deep?.summary || ai?.summary) && (
        <Section title="AI Summary" icon="🤖">
          <p className="text-sm text-gray-700 leading-relaxed">
            {deep?.summary || ai?.summary}
          </p>
        </Section>
      )}

      {/* Risks */}
      {hasRisks && (
        <Section title={`Potential Issues (${deep!.risks.length})`} icon="⚠️">
          <div className="space-y-3">
            {deep!.risks.map((r, i) => <RiskCard key={i} risk={r} />)}
          </div>
        </Section>
      )}

      {/* Inconsistencies */}
      {(deep?.inconsistencies?.length ?? 0) > 0 && (
        <Section title={`Inconsistencies (${deep!.inconsistencies.length})`} icon="🔍">
          <div className="space-y-2">
            {deep!.inconsistencies.map((item, i) => {
              const cfg = SEV_CFG[item.severity] ?? SEV_CFG.LOW;
              return (
                <div key={i} className={`border rounded-lg p-3 ${cfg.bg}`}>
                  <p className={`text-sm font-semibold ${cfg.text}`}>{item.issue}</p>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                  {item.locations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.locations.map((l, j) => (
                        <span key={j} className="text-xs bg-white/70 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Missing Info */}
      {(deep?.missing_information?.length ?? 0) > 0 && (
        <Section title={`Missing Information (${deep!.missing_information.length})`} icon="❓">
          <div className="space-y-2">
            {deep!.missing_information.map((item, i) => {
              const cfg = SEV_CFG[item.severity] ?? SEV_CFG.LOW;
              return (
                <div key={i} className={`border rounded-lg p-3 ${cfg.bg} flex items-start gap-3`}>
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full border text-xs shrink-0 mt-0.5 ${cfg.bg} ${cfg.text}">{item.severity}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.issue}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Reviewer checklist */}
      {canAct && isPending && (
        <Section title="Review Checklist" icon="✅">
          <ReviewChecklist checked={checklist} onChange={toggleCheck} />
        </Section>
      )}

      {/* Reviewer comments + actions */}
      {isPending && canAct && !actionDone && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            💬 Reviewer Comments
          </h3>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            rows={3}
            placeholder="Add comments for the document submitter…"
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => doAction("approve")}
              disabled={!!submitting}
              className="flex-1 min-w-[140px] bg-emerald-600 text-white py-2.5 rounded-xl
                         text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50
                         transition-colors"
            >
              {submitting === "approve" ? "Approving…" : "✓ Approve"}
            </button>
            <button
              onClick={() => doAction("changes")}
              disabled={!!submitting}
              className="flex-1 min-w-[140px] bg-purple-600 text-white py-2.5 rounded-xl
                         text-sm font-semibold hover:bg-purple-700 disabled:opacity-50
                         transition-colors"
            >
              {submitting === "changes" ? "Requesting…" : "↺ Request Changes"}
            </button>
            <button
              onClick={() => doAction("reject")}
              disabled={!!submitting}
              className="flex-1 min-w-[140px] bg-red-600 text-white py-2.5 rounded-xl
                         text-sm font-semibold hover:bg-red-700 disabled:opacity-50
                         transition-colors"
            >
              {submitting === "reject" ? "Rejecting…" : "✗ Reject"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            All decisions are recorded in the audit log and the submitter will be notified.
          </p>
        </div>
      )}

      {/* Completed decision */}
      {!isPending && approval.comments && (
        <Section title="Reviewer Decision" icon="📝">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center
                            text-indigo-700 font-semibold text-sm uppercase shrink-0">
              {approval.reviewer_detail?.username?.charAt(0) ?? "R"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {approval.reviewer_detail?.username}
                <span className="ml-2 text-xs text-gray-400">
                  {approval.reviewed_at ? new Date(approval.reviewed_at).toLocaleString() : ""}
                </span>
              </p>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{approval.comments}</p>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
