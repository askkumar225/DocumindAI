/**
 * documentApi — document management service layer.
 *
 * All document-related HTTP calls go through this module.
 */

import api from "./api";
import type {
  Document,
  DocumentListItem,
  DocumentDeepAnalysis,
  DocumentComparison,
  DocumentComparisonListItem,
} from "../types/document";

const documentApi = {
  // ── Document CRUD ──────────────────────────────────────────────────────────

  /** List all authorized documents (lightweight). */
  list: () =>
    api.get<DocumentListItem[]>("/documents/"),

  /** Get full document detail. */
  get: (id: number) =>
    api.get<Document>(`/documents/${id}/`),

  /**
   * Upload a new document.
   * @param title  Document display name
   * @param file   File object from input[type=file]
   */
  upload: (title: string, file: File) => {
    const form = new FormData();
    form.append("title", title);
    form.append("file", file);
    return api.post<Document>("/documents/upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** Delete a document (owner or admin only). */
  delete: (id: number) =>
    api.delete(`/documents/${id}/`),

  // ── Document analysis ──────────────────────────────────────────────────────

  /** Get AI analysis (classification, extracted fields, summary). */
  getAnalysis: (id: number) =>
    api.get(`/documents/${id}/analysis/`),

  /** Get deep AI analysis (dates, amounts, risks, inconsistencies, etc.). */
  getDeepAnalysis: (id: number) =>
    api.get<DocumentDeepAnalysis & { document_id: number }>(`/documents/${id}/deep_analysis/`),

  /** Get extracted text content. */
  getContent: (id: number) =>
    api.get(`/documents/${id}/content/`),

  // ── Comparisons ────────────────────────────────────────────────────────────

  /** List all comparisons for the current user. */
  listComparisons: () =>
    api.get<DocumentComparisonListItem[]>("/comparisons/"),

  /** Get full comparison with results. */
  getComparison: (id: number) =>
    api.get<DocumentComparison>(`/comparisons/${id}/`),

  /**
   * Create a new comparison.
   * @param documentIds  At least 2 document IDs to compare
   * @param title        Optional title
   */
  createComparison: (documentIds: number[], title?: string) =>
    api.post<{ id: number; status: string }>("/comparisons/", {
      document_ids: documentIds,
      title: title ?? "Document Comparison",
    }),

  /** Re-run an existing comparison. */
  runComparison: (id: number) =>
    api.post(`/comparisons/${id}/run/`),

  /** Delete a comparison. */
  deleteComparison: (id: number) =>
    api.delete(`/comparisons/${id}/`),
};

export default documentApi;
