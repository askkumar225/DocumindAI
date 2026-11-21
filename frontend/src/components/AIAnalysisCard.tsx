import type { AIAnalysis } from "../types/document";

interface AIAnalysisCardProps {
  analysis: AIAnalysis;
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ percent }: { percent: number }) {
  const color =
    percent >= 85 ? "bg-emerald-500" :
    percent >= 65 ? "bg-yellow-400" :
                    "bg-red-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">
        {percent}%
      </span>
    </div>
  );
}

// ─── Extracted fields table ───────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  const display =
    typeof value === "boolean"
      ? value ? "Yes" : "No"
      : Array.isArray(value)
      ? value.join(", ")
      : typeof value === "number"
      ? value.toLocaleString()
      : String(value);

  // Convert snake_case label → Title Case
  const title = label
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <tr className="border-t border-gray-50">
      <td className="py-2 pr-4 text-sm text-gray-500 font-medium w-48 align-top">
        {title}
      </td>
      <td className="py-2 text-sm text-gray-800 break-words">{display}</td>
    </tr>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function AIAnalysisCard({ analysis }: AIAnalysisCardProps) {
  const fields = Object.entries(analysis.extracted_data ?? {});

  return (
    <div className="space-y-6">

      {/* Classification + Confidence */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          AI Classification
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-2xl font-bold text-indigo-700">
            {analysis.document_type}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            via {analysis.model_name || "LLM"}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-2">Confidence</p>
        <ConfidenceBar percent={analysis.confidence_percent} />

        {analysis.confidence_percent < 65 && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
            ⚠ Low confidence score. Human review recommended.
          </p>
        )}
      </div>

      {/* AI Summary */}
      {analysis.summary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            AI Summary
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analysis.summary}
          </p>
        </div>
      )}

      {/* Extracted Fields */}
      {fields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Extracted Information
          </h2>
          <table className="w-full">
            <tbody>
              {fields.map(([key, value]) => (
                <FieldRow key={key} label={key} value={value} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error state */}
      {analysis.ai_status === "FAILED" && analysis.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700 mb-1">
            AI Processing Failed
          </p>
          <p className="text-xs text-red-500 font-mono break-all">
            {analysis.error_message}
          </p>
        </div>
      )}
    </div>
  );
}
