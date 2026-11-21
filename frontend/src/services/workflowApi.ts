/**
 * workflowApi — approvals, permissions, risks, notifications.
 */

import api from "./api";
import type { ApprovalRequest, ApprovalPriority } from "../types/document";

export interface CreateApprovalPayload {
  document:  number;
  reviewer:  number;
  priority?: ApprovalPriority;
  due_date?: string;
}

export interface ApprovalActionPayload {
  comments?: string;
}

const workflowApi = {
  // ── Approvals ──────────────────────────────────────────────────────────────

  /** List all approval requests (scoped by role). */
  listApprovals: () =>
    api.get<ApprovalRequest[]>("/workflows/approvals/"),

  /** Get pending approvals assigned to current user. */
  getPendingApprovals: () =>
    api.get<ApprovalRequest[]>("/workflows/approvals/pending/"),

  /** Get one approval request. */
  getApproval: (id: number) =>
    api.get<ApprovalRequest>(`/workflows/approvals/${id}/`),

  /** Submit a document for approval. */
  createApproval: (data: CreateApprovalPayload) =>
    api.post<ApprovalRequest>("/workflows/approvals/", data),

  /** Approve a document. */
  approve: (id: number, payload: ApprovalActionPayload = {}) =>
    api.post<ApprovalRequest>(`/workflows/approvals/${id}/approve/`, payload),

  /** Reject a document. */
  reject: (id: number, payload: ApprovalActionPayload = {}) =>
    api.post<ApprovalRequest>(`/workflows/approvals/${id}/reject/`, payload),

  /** Request changes from the submitter. */
  requestChanges: (id: number, payload: ApprovalActionPayload = {}) =>
    api.post<ApprovalRequest>(`/workflows/approvals/${id}/request_changes/`, payload),

  // ── Risks ──────────────────────────────────────────────────────────────────

  /** Get all AI-detected risks for a document. */
  getDocumentRisks: (documentId: number) =>
    api.get(`/workflows/documents/${documentId}/risks/`),

  // ── Permissions ───────────────────────────────────────────────────────────

  /** List document permissions. */
  listPermissions: () =>
    api.get("/workflows/permissions/"),

  /** Grant a permission. */
  grantPermission: (data: {
    document: number;
    user?: number;
    role?: string;
    can_view?: boolean;
    can_download?: boolean;
    can_approve?: boolean;
  }) =>
    api.post("/workflows/permissions/", data),

  /** Revoke a permission. */
  revokePermission: (id: number) =>
    api.delete(`/workflows/permissions/${id}/`),

  // ── Notifications ─────────────────────────────────────────────────────────

  /** Get current user's notifications. */
  getNotifications: (params?: { unread_only?: boolean; limit?: number }) =>
    api.get("/notifications/", { params }),

  /** Mark a single notification as read. */
  markRead: (id: number) =>
    api.post(`/notifications/${id}/read/`),

  /** Mark all notifications as read. */
  markAllRead: () =>
    api.post("/notifications/read-all/"),

  // ── Audit ─────────────────────────────────────────────────────────────────

  /** Get full audit log (ADMIN only). */
  getAuditLog: (params?: { action?: string; user_id?: number; limit?: number }) =>
    api.get("/audit/", { params }),

  /** Get audit timeline for a specific document. */
  getDocumentAudit: (documentId: number) =>
    api.get(`/audit/documents/${documentId}/`),
};

export default workflowApi;
