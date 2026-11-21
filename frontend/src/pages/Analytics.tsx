/**
 * Analytics — Document intelligence dashboard with charts + insights.
 *
 * Sections:
 *   1. Headline stat cards (documents, approvals, risks, conversations)
 *   2. AI insight cards (actionable alerts)
 *   3. Documents by type (bar chart via CSS)
 *   4. Documents by status (horizontal bar chart)
 *   5. Risk distribution (severity breakdown)
 *   6. Uploads last 7 days (sparkline bar chart)
 *   7. Recent documents list
 *   8. Health check status
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import dashboardApi, {
  type DashboardResponse,
  type AnalyticsResponse,
  type HealthCheckResponse,
} from "../services/dashboardApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH:     "bg-orange-500",
  MEDIUM:   "bg-yellow-400",
  LOW:      "bg-blue-400",
};

const STATUS_COLOR: Record<string, string> = {
  UPLOADED:         "bg-gray-400",
  PROCESSING:       "bg-yellow-400",
  PROCESSED:        "bg-blue-500",
  APPROVED:         "bg-emerald-500",
  PENDING_APPROVAL: "bg-indigo-400",
  REJECTED:         "bg-red-400",
  NEEDS_CHANGES:    "bg-purple-400",
  FAILED:           "bg-red-600",
};

const TYPE_ICON: Record<string, string> = {
  CONTRACT:      "📝",
  INVOICE:       "🧾",
  PURCHASE_ORDER:"📦",
  REPORT:        "📊",
  POLICY:        "📋",
  RECEIPT:       "🧾",
  UNKNOWN:       "📄",
  OTHER:         "📄",
};

const INSIGHT_ICON: Record<string, string> = {
  approval:   "⏳",
  risk:       "⚠️",
  error:      "❌",
  processing: "⚙️",
};

const INSIGHT_BG: Record<string, string> = {
  HIGH:   "bg-red-50 border-red-200",
  MEDIUM: "bg-orange-50 border-orange-200",
  LOW:    "bg-blue-50 border-blue-100",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub, onClick,
}: {
  label: string; value: number; color: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5
                  flex flex-col gap-1
                  ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className={`text-4xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function BarRow({ label, count, max, colorClass }: {
  label: string; count: number; max: number; colorClass: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 truncate shrink-0 font-medium">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
    </div>
  );
}

function SparkBar({ date, count, max }: { date: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  const d   = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("en-IN", { weekday: "short" });
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-gray-500 font-medium">{count}</span>
      <div className="w-full bg-gray-100 rounded-full overflow-hidden flex items-end" style={{ height: 60 }}>
        <div
          className="w-full bg-indigo-500 rounded-t transition-all duration-500"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

function HealthBadge({ service, status }: { service: string; status: string }) {
  const ok = status === "ok";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      <span className="text-sm font-medium text-gray-700 capitalize">{service}</span>
      <span className={`ml-auto text-xs font-semibold ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {status}
      </span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [health,    setHealth]    = useState<HealthCheckResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, analyticsRes, healthRes] = await Promise.allSettled([
          dashboardApi.getDashboard(),
          dashboardApi.getAnalytics(),
          dashboardApi.healthCheck(),
        ]);
        if (dashRes.status      === "fulfilled") setDashboard(dashRes.value.data);
        if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data);
        if (healthRes.status    === "fulfilled") setHealth(healthRes.value.data);
      } catch {
        setError("Could not load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center text-gray-400 text-sm">
        Loading analytics…
      </div>
    );
  }

  const stats    = dashboard?.stats;
  const insights = dashboard?.insights ?? [];
  const recentDocs = dashboard?.recent_docs ?? [];

  const maxType   = Math.max(...(analytics?.documents_by_type.map(r => r.count)   ?? [1]), 1);
  const maxStatus = Math.max(...(analytics?.documents_by_status.map(r => r.count) ?? [1]), 1);
  const maxRisk   = Math.max(...(analytics?.risk_distribution.map(r => r.count)   ?? [1]), 1);
  const maxUpload = Math.max(...(analytics?.uploads_last_7_days.map(r => r.count) ?? [1]), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Workspace overview for{" "}
          <span className="font-medium text-indigo-700">{user?.username}</span>
          {" "}({user?.role})
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Documents"
            value={stats.total_documents}
            color="text-gray-800"
            sub={`${stats.processed_documents} processed`}
            onClick={() => navigate("/documents")}
          />
          <StatCard
            label="Pending Approvals"
            value={stats.pending_approvals}
            color="text-yellow-500"
            onClick={() => navigate("/review")}
          />
          <StatCard
            label="High-Risk Documents"
            value={stats.high_risk_documents}
            color="text-red-500"
            onClick={() => navigate("/documents")}
          />
          <StatCard
            label="Approved"
            value={stats.approved_documents}
            color="text-emerald-600"
          />
          <StatCard
            label="Conversations"
            value={stats.total_conversations}
            color="text-indigo-600"
            onClick={() => navigate("/chat")}
          />
          <StatCard
            label="Unread Notifications"
            value={stats.unread_notifications}
            color="text-violet-600"
          />
          <StatCard
            label="Failed Processing"
            value={stats.failed_documents}
            color="text-red-400"
            sub="retry from Documents"
          />
          <StatCard
            label="Comparisons"
            value={0}
            color="text-blue-600"
            onClick={() => navigate("/comparisons")}
          />
        </div>
      )}

      {/* ── AI Insight cards ────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            🤖 AI Insights
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {insights.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <button
                key={i}
                onClick={() => insight.action_url && navigate(insight.action_url)}
                className={`text-left p-4 rounded-xl border ${INSIGHT_BG[insight.severity] ?? "bg-gray-50 border-gray-200"}
                            hover:shadow-sm transition-all`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{INSIGHT_ICON[insight.type] ?? "💡"}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.message}</p>
                  </div>
                  <svg className="ml-auto shrink-0 w-4 h-4 text-gray-400 mt-0.5"
                       viewBox="0 0 16 16" fill="none">
                    <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts grid ─────────────────────────────────────────────────────── */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Documents by type */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">Documents by Type</h3>
            {analytics.documents_by_type.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No documents yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.documents_by_type.map((row, i) => (
                  <BarRow
                    key={i}
                    label={`${TYPE_ICON[row.type] ?? "📄"} ${row.type.replace("_", " ")}`}
                    count={row.count}
                    max={maxType}
                    colorClass="bg-indigo-500"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Documents by status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">Documents by Status</h3>
            {analytics.documents_by_status.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No documents yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.documents_by_status.map((row, i) => (
                  <BarRow
                    key={i}
                    label={row.status.replace(/_/g, " ")}
                    count={row.count}
                    max={maxStatus}
                    colorClass={STATUS_COLOR[row.status] ?? "bg-gray-400"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Risk distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">Risk Distribution</h3>
            {analytics.risk_distribution.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No risks detected.</p>
            ) : (
              <div className="space-y-3">
                {analytics.risk_distribution.map((row, i) => (
                  <BarRow
                    key={i}
                    label={row.severity}
                    count={row.count}
                    max={maxRisk}
                    colorClass={SEVERITY_COLOR[row.severity] ?? "bg-gray-400"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Uploads last 7 days */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">Uploads — Last 7 Days</h3>
            <div className="flex items-end gap-1.5 h-20">
              {analytics.uploads_last_7_days.map((row, i) => (
                <SparkBar key={i} date={row.date} count={row.count} max={maxUpload} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent documents ────────────────────────────────────────────────── */}
      {recentDocs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Documents</h3>
            <button onClick={() => navigate("/documents")}
              className="text-xs text-indigo-600 hover:underline">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50
                           transition-colors text-left"
              >
                <span className="text-lg">{TYPE_ICON[doc.document_type] ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400">
                    {doc.document_type.replace("_", " ")} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  ${doc.status === "APPROVED"         ? "bg-emerald-50 text-emerald-700"
                  : doc.status === "PENDING_APPROVAL"  ? "bg-yellow-50 text-yellow-700"
                  : doc.status === "FAILED"            ? "bg-red-50 text-red-600"
                  : "bg-gray-100 text-gray-500"}`}>
                  {doc.status.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Service health ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Service Health</h3>
        {health ? (
          <div className="space-y-2.5">
            <HealthBadge service="API"      status={health.status}   />
            <HealthBadge service="Database" status={health.database} />
            <HealthBadge service="Redis"    status={health.redis}    />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Health status unavailable.</p>
        )}
      </div>
    </div>
  );
}
