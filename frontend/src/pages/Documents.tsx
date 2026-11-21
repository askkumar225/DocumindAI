import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { DocumentListItem } from "../types/document";
import { StatusBadge, AIStatusBadge } from "../components/StatusBadge";

const POLL_INTERVAL_MS = 3000;

function isInProgress(doc: DocumentListItem) {
  return (
    doc.status === "UPLOADED" ||
    doc.status === "PROCESSING" ||
    doc.status === "ANALYZING" ||
    doc.status === "EMBEDDING" ||
    doc.ai_status === "PENDING" ||
    doc.ai_status === "PROCESSING"
  );
}

function ExtractionBadge({
  method,
}: {
  method: string | null;
}) {
  if (!method || method === "UNKNOWN") return null;
  const styles: Record<string, string> = {
    PDF_TEXT: "bg-blue-50 text-blue-700",
    DOCX_TEXT: "bg-purple-50 text-purple-700",
    OCR: "bg-orange-50 text-orange-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        styles[method] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {method}
    </span>
  );
}

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchDocuments() {
    try {
      const res = await api.get<DocumentListItem[]>("/documents/");
      setDocuments(res.data);
      setError(null);
    } catch {
      setError("Could not load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocuments(); }, []);

  useEffect(() => {
    const anyInProgress = documents.some(isInProgress);
    if (anyInProgress && !pollRef.current) {
      pollRef.current = setInterval(fetchDocuments, POLL_INTERVAL_MS);
    }
    if (!anyInProgress && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [documents]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <button
          onClick={() => navigate("/upload")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm
                     font-medium hover:bg-indigo-700 transition-colors"
        >
          + Upload
        </button>
      </div>

      {documents.some(isInProgress) && (
        <p className="text-xs text-yellow-600 animate-pulse mb-4">
          ● Auto-refreshing — documents are processing
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && (
          <p className="text-center text-gray-400 py-16">Loading…</p>
        )}
        {error && (
          <p className="text-center text-red-400 py-16">{error}</p>
        )}
        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📄</div>
            <p>No documents yet.</p>
            <button
              onClick={() => navigate("/upload")}
              className="mt-4 text-indigo-600 hover:underline text-sm"
            >
              Upload your first document →
            </button>
          </div>
        )}

        {!loading && !error && documents.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">AI</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Pages</th>
                <th className="px-4 py-3 text-left">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                    {doc.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700
                                     px-2 py-0.5 rounded-full font-medium">
                      {doc.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} pulse />
                  </td>
                  <td className="px-4 py-3">
                    {doc.ai_status ? (
                      <div className="flex flex-col gap-1">
                        <AIStatusBadge status={doc.ai_status} />
                        {doc.confidence_percent !== null && doc.ai_status === "COMPLETED" && (
                          <span className="text-xs text-gray-400">
                            {doc.confidence_percent}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ExtractionBadge method={doc.extraction_method} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {doc.page_count ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
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
