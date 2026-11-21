/**
 * ExtractionResult — renders extracted data items (dates, amounts, entities, etc.)
 * Used when result_type="extraction".
 */

const SEV: Record<string, string> = {
  CRITICAL: "text-red-600", HIGH: "text-orange-600",
  MEDIUM: "text-yellow-600", LOW: "text-blue-600",
};

interface ExtractedItem {
  type: string;
  label?: string;
  name?: string;
  value?: string | number | null;
  kind?: string;
  context?: string;
  currency?: string;
  description?: string;
  severity?: string;
  issue?: string;
  page?: number | null;
}

interface Props {
  items: ExtractedItem[];
  extractType: string;
  documentTitle: string;
}

export default function ExtractionResult({ items, extractType, documentTitle }: Props) {
  if (!items.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 capitalize">{extractType}</span>
        <span className="text-xs text-gray-400">from {documentTitle}</span>
        <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
          {items.length} items
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {items.slice(0, 12).map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
            {/* Type icon */}
            <span className="text-base flex-shrink-0 mt-0.5">
              {item.type === "date"     ? "📅"
               : item.type === "amount"  ? "💰"
               : item.type === "entity"  ? "🏢"
               : item.type === "risk"    ? "⚠️"
               : item.type === "missing" ? "❓"
               : "📋"}
            </span>

            <div className="flex-1 min-w-0">
              {/* Date */}
              {item.type === "date" && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{item.name}</p>
                  <p className="text-sm font-bold text-gray-800">{item.value ?? "—"}</p>
                  {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                </>
              )}
              {/* Amount */}
              {item.type === "amount" && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{item.name}</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {item.currency && item.currency !== "null" ? `${item.currency} ` : ""}
                    {item.value != null ? Number(item.value).toLocaleString() : "—"}
                  </p>
                </>
              )}
              {/* Entity */}
              {item.type === "entity" && (
                <>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.kind}</p>
                </>
              )}
              {/* Risk */}
              {item.type === "risk" && (
                <>
                  <p className={`text-sm font-semibold ${SEV[item.severity ?? ""] ?? "text-gray-800"}`}>
                    {item.name ?? item.label}
                  </p>
                  {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
                </>
              )}
              {/* Missing / Key info / Field */}
              {!["date","amount","entity","risk"].includes(item.type) && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    {item.label ?? item.issue ?? item.name}
                  </p>
                  {item.value != null && (
                    <p className="text-sm text-gray-800">{String(item.value)}</p>
                  )}
                  {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                </>
              )}
              {item.page != null && (
                <p className="text-xs text-gray-300 mt-0.5">Page {item.page}</p>
              )}
            </div>
          </div>
        ))}
        {items.length > 12 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50">
            +{items.length - 12} more items
          </div>
        )}
      </div>
    </div>
  );
}
