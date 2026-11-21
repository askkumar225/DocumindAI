/**
 * ReviewCenter — Manager review queue dashboard.
 *
 * Shows:
 *   - Stat cards: pending, high priority, needs changes, approved today
 *   - Pending approvals table with document name, risk, priority, action
 *   - Employees see their own submitted documents and status
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../store/authStore";
import type { ApprovalRequest, ApprovalPriority } from "../types/document";

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<ApprovalPriority, { bg: string; text: string }> = {
  LOW:    { bg: "bg-gray-100",   text: "text-gray-600" },
  NORMAL: { bg: "bg-blue-50",   text: "text-blue-700" },
  HIGH:   { bg: "bg-orange-50", text: "text-orange-700" },
  URGENT: { bg: "bg-red-50",    text: "text-red-700" },
};

function PriorityBadge({ priority }: { priority: ApprovalPriority }) {
  const cfg = PRIORITY_CFG[priority] ?? PRIORITY_CFG.NORMAL;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {priority}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PENDING:       "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED:      "bg-red-50 text-red-700 border-red-200",
    NEEDS_CHANGES: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReviewCenter() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<"pending" | "all">("pending");

  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    try {
      const res = await api.get<ApprovalRequest[]>("/workflows/approvals/");
      setApprovals(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const pending       = approvals.filter(a => a.status === "PENDING");
  const highPriority  = pending.filter(a => a.priority === "HIGH" || a.priority === "URGENT");
  const needsChanges  = approvals.filter(a => a.status === "NEEDS_CHANGES");
  const approved      = approvals.filter(a => a.status === "APPROVED");

  const displayed = tab === "pending" ? pending : approvals;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? "Review Center" : "My Documents"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isManager
              ? "Review and approve documents assigned to you."
              : "Track your submitted documents and their review status."}
          </p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm
                     font-medium hover:bg-indigo-700 transition-colors"
        >
          + Upload Document
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Reviews"    value={pending.length}      color="text-yellow-500" />
        <StatCard label="High Priority"      value={highPriority.length} color="text-red-500"    />
        <StatCard label="Needs Changes"      value={needsChanges.length} color="text-purple-600" />
        <StatCard label="Approved"           value={approved.length}     color="text-emerald-600"/>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["pending", "all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "pending" ? `Pending (${pending.length})` : `All (${approvals.length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && <p className="text-center text-gray-400 py-12 text-sm">Loading…</p>}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No {tab === "pending" ? "pending" : ""} reviews.</p>
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Document</th>
                {isManager && <th className="px-4 py-3 text-left">Submitted by</th>}
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                {tab !== "pending" && <th className="px-4 py-3 text-left">Date</th>}
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(approval => (
                <tr key={approval.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/review/${approval.id}`)}
                      className="font-medium text-indigo-700 hover:underline text-left"
                    >
                      {approval.document_title}
                    </button>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3 text-gray-600">
                      {approval.requested_by_detail?.username ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <PriorityBadge priority={approval.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={approval.status} />
                  </td>
                  {tab !== "pending" && (
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(approval.created_at).toLocaleDateString()}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/review/${approval.id}`)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        approval.status === "PENDING" && isManager
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                      }`}
                    >
                      {approval.status === "PENDING" && isManager ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
