/**
 * AIOrb
 *
 * The central AI visual element on the left side of auth pages.
 * Features:
 *   - Pumping/pulsing core
 *   - Two slowly counter-rotating rings
 *   - Orbiting dots
 *   - Glow effect
 *   - DocuMind AI label
 */

import { motion } from "framer-motion";

export default function AIOrb() {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center select-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
    >
      {/* ── Outer glow ──────────────────────────────────────────────────── */}
      <div className="relative w-64 h-64 flex items-center justify-center">

        {/* Glow background */}
        <div className="absolute inset-0 rounded-full bg-indigo-600/10 blur-2xl animate-orb-pulse" />

        {/* Outer rotating ring */}
        <div
          className="absolute w-64 h-64 rounded-full border border-indigo-500/20
                     animate-spin-slow"
          style={{ borderStyle: "dashed" }}
        >
          {/* Orbiting dot 1 */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2
                          w-3 h-3 rounded-full bg-indigo-400
                          shadow-[0_0_8px_2px_rgba(129,140,248,0.8)]" />
          {/* Orbiting dot 2 */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2
                          w-2 h-2 rounded-full bg-violet-400
                          shadow-[0_0_6px_2px_rgba(167,139,250,0.7)]" />
        </div>

        {/* Middle counter-rotating ring */}
        <div
          className="absolute w-48 h-48 rounded-full border border-violet-500/25
                     animate-spin-reverse"
        >
          {/* Orbiting dot 3 */}
          <div className="absolute top-0 -right-1.5
                          w-2.5 h-2.5 rounded-full bg-violet-300
                          shadow-[0_0_8px_2px_rgba(196,181,253,0.8)]" />
          {/* Orbiting dot 4 */}
          <div className="absolute bottom-0 -left-1.5
                          w-2 h-2 rounded-full bg-indigo-300
                          shadow-[0_0_6px_2px_rgba(165,180,252,0.7)]" />
        </div>

        {/* Inner ring */}
        <div className="absolute w-36 h-36 rounded-full border border-indigo-400/20
                        animate-spin-slow" style={{ animationDuration: "20s" }} />

        {/* ── Core orb — pumping effect ────────────────────────────────── */}
        <div className="relative w-28 h-28 rounded-full animate-orb-pulse
                        animate-glow-pulse">
          {/* Core gradient */}
          <div className="absolute inset-0 rounded-full
                          bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700
                          shadow-[0_0_30px_8px_rgba(99,102,241,0.5)]" />

          {/* Inner highlight */}
          <div className="absolute top-3 left-4 w-8 h-4 rounded-full
                          bg-white/20 blur-sm" />

          {/* Centre icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              {/* Brain/AI circuit icon */}
              <circle cx="19" cy="19" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
              <circle cx="19" cy="19" r="4"  fill="rgba(255,255,255,0.9)"/>
              <line x1="19" y1="9"  x2="19" y2="5"  stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="19" y1="29" x2="19" y2="33" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9"  y1="19" x2="5"  y2="19" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="29" y1="19" x2="33" y2="19" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="12" x2="9"  y2="9"  stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="26" y1="12" x2="29" y2="9"  stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="26" x2="9"  y2="29" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="26" y1="26" x2="29" y2="29" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Label ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-white animate-logo-glow tracking-wide">
          DocuMind AI
        </h2>
        <p className="text-indigo-300/80 text-sm mt-2 font-light tracking-wider">
          Intelligent Documents. Smarter Decisions.
        </p>

        {/* Feature pills */}
        <div className="mt-6 flex flex-col gap-3 items-start">
          {[
            { icon: "🔒", text: "Enterprise-grade security" },
            { icon: "🤖", text: "AI-powered document analysis" },
            { icon: "⚡", text: "Instant intelligent search" },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2.5 text-indigo-200/70 text-sm"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 + i * 0.15, duration: 0.5 }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
