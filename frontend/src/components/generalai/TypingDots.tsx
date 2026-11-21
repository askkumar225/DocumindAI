/**
 * TypingDots.tsx — Animated "AI is thinking" indicator.
 * Shown between the user sending a message and the first streaming chunk arriving.
 */

import { motion } from "framer-motion";

export default function TypingDots() {
  return (
    <div className="flex items-start gap-4">
      {/* AI avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                   text-sm font-black text-white select-none
                   bg-gradient-to-br from-violet-600 to-indigo-700"
      >
        ✦
      </div>

      {/* Dot container */}
      <div
        className="bg-slate-800/80 border border-slate-700/50
                   rounded-2xl rounded-tl-sm px-5 py-4"
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-2 h-2 rounded-full bg-violet-400"
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
