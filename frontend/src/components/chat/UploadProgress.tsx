/**
 * UploadProgress — shows per-file upload + processing stages.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { UploadingDoc } from "../../types/chat";

const STAGE_LABELS: Record<UploadingDoc["stage"], string> = {
  uploading:  "Uploading…",
  processing: "Understanding document…",
  ready:      "✓ Ready to chat",
  error:      "Upload failed",
};

const STAGE_COLORS: Record<UploadingDoc["stage"], string> = {
  uploading:  "bg-blue-500",
  processing: "bg-indigo-500",
  ready:      "bg-emerald-500",
  error:      "bg-red-500",
};

interface UploadProgressProps {
  docs: UploadingDoc[];
}

export default function UploadProgress({ docs }: UploadProgressProps) {
  if (docs.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pb-2">
      <AnimatePresence initial={false}>
        {docs.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-gray-100 rounded-lg px-3 py-2.5
                       shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm flex-shrink-0">📎</span>
                <span className="text-xs font-medium text-gray-700 truncate">
                  {doc.name}
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${doc.stage === "ready"  ? "bg-emerald-50 text-emerald-700" :
                  doc.stage === "error"  ? "bg-red-50 text-red-600" :
                                           "bg-indigo-50 text-indigo-600"}`}>
                {STAGE_LABELS[doc.stage]}
              </span>
            </div>

            {/* Progress bar */}
            {doc.stage !== "ready" && doc.stage !== "error" && (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${STAGE_COLORS[doc.stage]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${doc.progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}

            {doc.stage === "ready" && (
              <div className="h-1 bg-emerald-200 rounded-full" />
            )}

            {doc.error && (
              <p className="text-[10px] text-red-500 mt-1">{doc.error}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
