/**
 * dashboardApi — dashboard stats, insights, analytics, health check.
 */

import api from "./api";

export interface DashboardStats {
  total_documents:      number;
  processed_documents:  number;
  pending_approvals:    number;
  high_risk_documents:  number;
  approved_documents:   number;
  failed_documents:     number;
  total_conversations:  number;
  unread_notifications: number;
}

export interface DashboardInsight {
  type:       string;
  title:      string;
  message:    string;
  count:      number;
  severity:   string;
  action_url: string;
}

export interface RecentDocument {
  id:            number;
  title:         string;
  document_type: string;
  status:        string;
  created_at:    string;
}

export interface DashboardResponse {
  stats:       DashboardStats;
  insights:    DashboardInsight[];
  recent_docs: RecentDocument[];
}

export interface AnalyticsResponse {
  documents_by_type:   { type: string;     count: number }[];
  documents_by_status: { status: string;   count: number }[];
  risk_distribution:   { severity: string; count: number }[];
  uploads_last_7_days: { date: string;     count: number }[];
}

export interface HealthCheckResponse {
  status:   "ok" | "degraded";
  database: "ok" | "error";
  redis:    "ok" | "unavailable";
}

const dashboardApi = {
  /** Get headline stats + insights + recent documents. */
  getDashboard: () =>
    api.get<DashboardResponse>("/dashboard/"),

  /** Get chart analytics data. */
  getAnalytics: () =>
    api.get<AnalyticsResponse>("/dashboard/analytics/"),

  /** Check service health (no auth required). */
  healthCheck: () =>
    api.get<HealthCheckResponse>("/health/"),
};

export default dashboardApi;
