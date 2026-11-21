/**
 * WelcomeScreen.tsx — Empty-state shown before the first message in a chat.
 *
 * Shows the General AI branding, a short description, and 4 suggestion chips.
 * Clicking a chip fires onSuggestion(prompt) which populates the input bar.
 */

import { motion } from "framer-motion";
import type { Suggestion } from "../../types/ai";

const SUGGESTIONS: Suggestion[] = [
  {
    icon: "🧠",
    label: "Explain a concept",
    prompt: "Explain a complex topic in simple words — like how the internet works.",
  },
  {
    icon: "✍️",
    label: "Write content",
    prompt: "Help me write a professional email to my manager requesting a week off.",
  },
  {
    icon: "💻",
    label: "Teach me coding",
    prompt: "Teach me Python programming — start with the basics for a complete beginner.",
  },
  {
    icon: "🤖",
    label: "Explain AI",
    prompt: "Explain how artificial intelligence works in simple, everyday language.",
  },
  {
    icon: "🎯",
    label: "Interview prep",
    prompt: "Help me prepare for a software engineering interview — what should I study?",
  },
];

interface WelcomeScreenProps {
  onSuggestion: (prompt: string) => void;
}

export default function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">

      {/* Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6"
        style={{
          background:  "linear-gradient(135deg,#4f46e5,#7c3aed)",
          boxShadow:   "0 0 40px rgba(99,102,241,0.45)",
        }}
      >
        ✨
      </motion.div>

      {/* Heading */}
      <motion.h2
        className="text-3xl font-black text-white mb-2 tracking-tight"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        General AI
      </motion.h2>

      {/* Sub-heading */}
      <motion.p
        className="text-slate-500 text-base mb-10 max-w-sm leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        How can I help you today?
        <br />
        <span className="text-slate-600 text-sm">
          Ask questions, explore ideas, learn new concepts, write content, or solve problems.
        </span>
      </motion.p>

      {/* Suggestion chips — 2 columns, 5 chips (last one centered) */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <motion.button
              key={s.label}
              onClick={() => onSuggestion(s.prompt)}
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left
                         bg-slate-900/60 border border-slate-800/60
                         hover:bg-slate-800/80 hover:border-indigo-500/30
                         transition-all duration-200 group"
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">
                {s.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                  {s.label}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2">
                  {s.prompt}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
        {/* 5th chip — full width */}
        <motion.button
          key={SUGGESTIONS[4].label}
          onClick={() => onSuggestion(SUGGESTIONS[4].prompt)}
          className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left
                     bg-slate-900/60 border border-slate-800/60
                     hover:bg-slate-800/80 hover:border-indigo-500/30
                     transition-all duration-200 group"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">
            {SUGGESTIONS[4].icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
              {SUGGESTIONS[4].label}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">
              {SUGGESTIONS[4].prompt}
            </p>
          </div>
        </motion.button>
      </motion.div>

      {/* Disclaimer */}
      <motion.p
        className="text-slate-700 text-xs mt-8 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        General AI does not access your private documents or resume data.
      </motion.p>
    </div>
  );
}
