import type { DocumentStatus, AIStatus } from "../types/document";

// ─── Document processing status badge ────────────────────────────────────────

const DOC_STATUS_STYLES: Partial<Record<DocumentStatus, string>> = {
  UPLOADED:         "bg-blue-100 text-blue-700",
  PROCESSING:       "bg-yellow-100 text-yellow-700",
  ANALYZING:        "bg-purple-100 text-purple-700",
  EMBEDDING:        "bg-indigo-100 text-indigo-700",
  PROCESSED:        "bg-green-100 text-green-700",
  READY:            "bg-emerald-100 text-emerald-700",
  FAILED:           "bg-red-100 text-red-700",
  REVIEW_REQUIRED:  "bg-orange-100 text-orange-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED:         "bg-emerald-100 text-emerald-700",
  REJECTED:         "bg-red-100 text-red-700",
  NEEDS_CHANGES:    "bg-purple-100 text-purple-700",
  ARCHIVED:         "bg-gray-100 text-gray-500",
};

const DOC_STATUS_LABELS: Partial<Record<DocumentStatus, string>> = {
  UPLOADED:         "Uploaded",
  PROCESSING:       "Processing",
  ANALYZING:        "Analyzing…",
  EMBEDDING:        "Embedding…",
  PROCESSED:        "Processed",
  READY:            "Ready",
  FAILED:           "Failed",
  REVIEW_REQUIRED:  "Review Required",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED:         "Approved",
  REJECTED:         "Rejected",
  NEEDS_CHANGES:    "Needs Changes",
  ARCHIVED:         "Archived",
};

const PULSING_STATUSES: DocumentStatus[] = [
  "UPLOADED", "PROCESSING", "ANALYZING", "EMBEDDING",
];

interface StatusBadgeProps {
  status: DocumentStatus;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const isPulsing = pulse && PULSING_STATUSES.includes(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-semibold
        ${DOC_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}
        ${isPulsing ? "animate-pulse" : ""}`}
    >
      {DOC_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── AI analysis status badge ─────────────────────────────────────────────────

const AI_STATUS_STYLES: Record<AIStatus, string> = {
  PENDING:    "bg-gray-100 text-gray-500",
  PROCESSING: "bg-purple-100 text-purple-700",
  COMPLETED:  "bg-emerald-100 text-emerald-700",
  FAILED:     "bg-red-100 text-red-600",
};

const AI_STATUS_LABELS: Record<AIStatus, string> = {
  PENDING:    "AI Pending",
  PROCESSING: "AI Processing",
  COMPLETED:  "AI Done",
  FAILED:     "AI Failed",
};

interface AIStatusBadgeProps {
  status: AIStatus;
}

export function AIStatusBadge({ status }: AIStatusBadgeProps) {
  const isPulsing = status === "PROCESSING";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-semibold
        ${AI_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}
        ${isPulsing ? "animate-pulse" : ""}`}
    >
      {AI_STATUS_LABELS[status]}
    </span>
  );
}
