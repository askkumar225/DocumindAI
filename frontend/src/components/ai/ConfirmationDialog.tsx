/**
 * ConfirmationDialog — shown before executing destructive AI actions.
 * (approve, reject, delete documents via chat)
 */

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  prompt: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmationDialog({
  open, prompt, onConfirm, onCancel, loading = false,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/40 backdrop-blur-sm px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200
                              flex items-center justify-center mx-auto mb-3 text-2xl">
                ⚠️
              </div>
              <p className="font-semibold text-gray-800 text-base">Confirm Action</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{prompt}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                           font-medium text-gray-700 hover:bg-gray-50 transition-colors
                           disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm
                           font-medium hover:bg-indigo-700 transition-colors
                           disabled:opacity-50"
              >
                {loading ? "Processing…" : "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
