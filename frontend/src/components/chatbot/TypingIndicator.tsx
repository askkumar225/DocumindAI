/**
 * TypingIndicator
 *
 * Animated "DocuMind AI is typing..." with three bouncing dots.
 */

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2 justify-start"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full
                      bg-gradient-to-br from-indigo-500 to-violet-600
                      flex items-center justify-center text-xs shadow-md">
        🤖
      </div>

      {/* Dots bubble */}
      <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm
                      px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
