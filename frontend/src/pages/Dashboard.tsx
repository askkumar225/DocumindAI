/**
 * Dashboard — DocuMind AI Command Centre  (v2)
 *
 * Layout  : Full-screen dark canvas
 *           ┌──────────────────────────────┐
 *           │  greeting + live badge       │
 *           │  ─────── AI CORE ─────────   │
 *           │  [✨ General] [🧠 Orb] [💬Chat]│
 *           │  [🚀 Career]         [📊 Insight]│
 *           │  stat counters               │
 *           │  quick-actions | recent-docs │
 *           └──────────────────────────────┘
 *
 * Animations used from index.css:
 *   animate-energy-pulse, animate-orb-ripple, animate-card-float,
 *   animate-title-shimmer, animate-scan-line, animate-logo-glow,
 *   animate-spin-slow, animate-spin-reverse, dash-grid-bg
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/authStore";
import dashboardApi from "../services/dashboardApi";
import type { DashboardStats, RecentDocument } from "../services/dashboardApi";

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ─── Floating Particles ───────────────────────────────────────────────────────

function Particles() {
  const pts = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    sz: Math.random() * 3 + 1,
    dur: Math.random() * 8 + 6,
    delay: Math.random() * 5,
    color: ["rgba(129,140,248,0.5)", "rgba(167,139,250,0.4)", "rgba(196,181,253,0.3)", "rgba(99,102,241,0.45)"][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.sz * 4,
            height: p.sz * 4,
            background: p.color,
            boxShadow: `0 0 ${p.sz * 6}px ${p.sz * 2}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 14, 0],
            opacity: [0.3, 0.9, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────

function Background() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Deep space gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020611] via-[#060d1f] to-[#020611]" />
      {/* Moving grid */}
      <div className="absolute inset-0 dash-grid-bg opacity-100" />
      {/* Corner nebulae */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
                      bg-indigo-900/20 blur-[100px]" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full
                      bg-violet-900/20 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[700px] h-[700px] rounded-full bg-indigo-950/30 blur-[120px]" />
    </div>
  );
}

// ─── Connecting Beam (SVG line from orb to card) ──────────────────────────────

function ConnectingBeam({
  x1, y1, x2, y2, color, delay,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; delay: number;
}) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth="1.5"
      strokeDasharray={len}
      strokeDashoffset={len}
      strokeLinecap="round"
      animate={{ strokeDashoffset: [len, 0, len], opacity: [0, 0.7, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

// ─── AI Brain Orb (center) ────────────────────────────────────────────────────

function AIOrb({ size = 120 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ripple rings */}
      {[0, 0.8, 1.6].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-indigo-500/20"
          style={{ width: size + 48 + i * 32, height: size + 48 + i * 32 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: d, ease: "easeInOut" }}
        />
      ))}

      {/* Orbit ring 1 — slow clockwise */}
      <motion.div
        className="absolute rounded-full border border-dashed border-indigo-400/25"
        style={{ width: size + 40, height: size + 40 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        {/* Dot on ring */}
        <div
          className="absolute rounded-full bg-indigo-400"
          style={{
            width: 10, height: 10, top: -5,
            left: "50%", transform: "translateX(-50%)",
            boxShadow: "0 0 10px 3px rgba(129,140,248,0.9)",
          }}
        />
        <div
          className="absolute rounded-full bg-violet-400"
          style={{
            width: 7, height: 7, bottom: -3.5,
            left: "50%", transform: "translateX(-50%)",
            boxShadow: "0 0 8px 2px rgba(167,139,250,0.8)",
          }}
        />
      </motion.div>

      {/* Orbit ring 2 — reverse */}
      <motion.div
        className="absolute rounded-full border border-violet-500/20"
        style={{ width: size + 16, height: size + 16 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute rounded-full bg-violet-300"
          style={{
            width: 8, height: 8, top: "50%", right: -4,
            transform: "translateY(-50%)",
            boxShadow: "0 0 8px 2px rgba(196,181,253,0.8)",
          }}
        />
      </motion.div>

      {/* Glow halo */}
      <motion.div
        className="absolute rounded-full bg-indigo-600/25 blur-3xl"
        style={{ width: size * 1.2, height: size * 1.2 }}
        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core orb */}
      <motion.div
        className="relative rounded-full flex items-center justify-center animate-energy-pulse"
        style={{
          width: size, height: size,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Scan line sweep */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
          style={{ opacity: 0.4 }}
        >
          <div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r
                        from-transparent via-white/60 to-transparent animate-scan-line"
          />
        </div>

        {/* Inner specular highlight */}
        <div
          className="absolute rounded-full bg-white/15 blur-sm"
          style={{ width: size * 0.55, height: size * 0.3, top: "18%", left: "22%" }}
        />

        {/* Neural icon */}
        <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
          <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.95)" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 24 + 10 * Math.cos(rad);
            const y1 = 24 + 10 * Math.sin(rad);
            const x2 = 24 + 17 * Math.cos(rad);
            const y2 = 24 + 17 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
          {/* Outer node dots */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 24 + 20 * Math.cos(rad);
            const cy = 24 + 20 * Math.sin(rad);
            return <circle key={i} cx={cx} cy={cy} r="2" fill="rgba(255,255,255,0.7)" />;
          })}
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ─── Module card definitions ──────────────────────────────────────────────────

interface ModuleDef {
  icon: string;
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
  gradient: string;
  border: string;
  glow: string;
  accentColor: string;
  beamColor: string;
  delay: number;
  floatDelay: string;
}

const MODULES: ModuleDef[] = [
  {
    icon: "✨",
    emoji: "✨",
    title: "General AI",
    subtitle: "Ask anything · Reasoning · Code",
    route: "/ai",
    gradient: "from-violet-600/25 via-indigo-600/15 to-transparent",
    border: "border-violet-500/35",
    glow: "rgba(139,92,246,0.35)",
    accentColor: "text-violet-400",
    beamColor: "rgba(139,92,246,0.6)",
    delay: 0.1,
    floatDelay: "0s",
  },
  {
    icon: "💬",
    emoji: "💬",
    title: "Docs Chat",
    subtitle: "RAG · Citations · Q&A",
    route: "/chat",
    gradient: "from-indigo-600/25 via-blue-600/15 to-transparent",
    border: "border-indigo-500/35",
    glow: "rgba(99,102,241,0.35)",
    accentColor: "text-indigo-400",
    beamColor: "rgba(99,102,241,0.6)",
    delay: 0.2,
    floatDelay: "1s",
  },
  {
    icon: "🚀",
    emoji: "🚀",
    title: "Career AI",
    subtitle: "Resume · Interview · Jobs",
    route: "/resume",
    gradient: "from-emerald-600/25 via-teal-600/15 to-transparent",
    border: "border-emerald-500/35",
    glow: "rgba(16,185,129,0.35)",
    accentColor: "text-emerald-400",
    beamColor: "rgba(16,185,129,0.6)",
    delay: 0.3,
    floatDelay: "2s",
  },
  {
    icon: "📊",
    emoji: "📊",
    title: "Insight Analytics",
    subtitle: "Risks · Trends · Reports",
    route: "/analytics",
    gradient: "from-amber-600/25 via-orange-600/15 to-transparent",
    border: "border-amber-500/35",
    glow: "rgba(245,158,11,0.35)",
    accentColor: "text-amber-400",
    beamColor: "rgba(245,158,11,0.6)",
    delay: 0.4,
    floatDelay: "1.5s",
  },
];

function ModuleCard({ mod, onClick }: { mod: ModuleDef; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: mod.delay, duration: 0.6, type: "spring", stiffness: 180, damping: 18 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.06, y: -6 }}
      whileTap={{ scale: 0.96 }}
      className={`relative overflow-hidden rounded-2xl border text-left w-full h-full
                  bg-slate-900/75 backdrop-blur-md ${mod.border}
                  transition-all duration-300 cursor-pointer`}
      style={{
        boxShadow: hovered
          ? `0 0 32px 6px ${mod.glow}, 0 8px 32px rgba(0,0,0,0.4)`
          : `0 0 12px 2px ${mod.glow.replace("0.35", "0.15")}, 0 4px 16px rgba(0,0,0,0.3)`,
        animation: `cardFloat 4s ease-in-out ${mod.floatDelay} infinite`,
      }}
    >
      {/* Gradient fill */}
      <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient}
                       transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-70"}`} />

      {/* Top shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r
                      from-transparent via-white/25 to-transparent" />

      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-20"
        style={{ background: `radial-gradient(circle at top right, ${mod.glow.replace("0.35", "0.8")}, transparent 70%)` }}
      />

      {/* Hover scan line */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r
                        from-transparent via-white/40 to-transparent pointer-events-none"
            initial={{ top: 0, opacity: 0 }}
            animate={{ top: "100%", opacity: [0, 0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      <div className="relative p-5 flex flex-col gap-3 h-full">
        {/* Icon */}
        <div className="relative w-12 h-12">
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: mod.glow.replace("0.35", "0.3") }}
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: mod.glow.replace("0.35", "0.15"), border: `1px solid ${mod.glow.replace("0.35", "0.4")}` }}
          >
            {mod.icon}
          </div>
        </div>

        <div>
          <p className="text-white font-bold text-base leading-tight animate-logo-glow">
            {mod.title}
          </p>
          <p className={`text-xs mt-0.5 ${mod.accentColor} opacity-80`}>{mod.subtitle}</p>
        </div>

        {/* Launch button */}
        <motion.div
          className={`mt-auto flex items-center gap-1.5 text-xs font-semibold ${mod.accentColor}`}
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <span>Launch</span>
          <motion.span animate={{ x: hovered ? 3 : 0 }}>→</motion.span>
        </motion.div>
      </div>
    </motion.button>
  );
}

// ─── Center AI Core panel ─────────────────────────────────────────────────────

function AICorePanel() {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center gap-3
                 rounded-3xl bg-slate-900/60 backdrop-blur-xl
                 border border-indigo-500/25 overflow-hidden py-8 px-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        boxShadow: "0 0 60px 10px rgba(99,102,241,0.15), inset 0 0 40px rgba(99,102,241,0.05)",
      }}
    >
      {/* Background pulse */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 rounded-3xl border border-indigo-500/15"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* SVG beam connections (purely decorative lines from center outward) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          <radialGradient id="beamGrad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.8)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </radialGradient>
        </defs>
        {/* Four diagonal beams */}
        {[
          { x1: "50%", y1: "50%", x2: "10%",  y2: "10%",  color: "rgba(139,92,246,0.4)",  delay: 0 },
          { x1: "50%", y1: "50%", x2: "90%",  y2: "10%",  color: "rgba(99,102,241,0.4)",  delay: 0.6 },
          { x1: "50%", y1: "50%", x2: "10%",  y2: "90%",  color: "rgba(16,185,129,0.4)",  delay: 1.2 },
          { x1: "50%", y1: "50%", x2: "90%",  y2: "90%",  color: "rgba(245,158,11,0.4)",  delay: 1.8 },
        ].map((b, i) => (
          <motion.line
            key={i}
            x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={b.color}
            strokeWidth="1"
            strokeDasharray="120"
            strokeDashoffset="120"
            strokeLinecap="round"
            animate={{ strokeDashoffset: [120, 0, 120], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: b.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {/* AI Orb */}
      <div style={{ zIndex: 2 }}>
        <AIOrb size={110} />
      </div>

      {/* Label */}
      <div className="text-center relative z-10 mt-1">
        <p className="text-lg font-black tracking-tight animate-title-shimmer">
          DocuMind AI
        </p>
        <p className="text-slate-500 text-[10px] tracking-[0.25em] uppercase mt-0.5 font-medium">
          Intelligent · Modular · Secure
        </p>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap justify-center gap-2 relative z-10">
        {[
          { dot: "bg-emerald-400", label: "AI Online" },
          { dot: "bg-indigo-400",  label: "RAG Active" },
          { dot: "bg-violet-400",  label: "LLM Ready" },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15 }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse`} />
            {p.label}
          </motion.div>
        ))}
      </div>

      {/* Bottom feature list */}
      <div className="flex flex-col gap-1.5 w-full relative z-10 mt-1">
        {[
          { icon: "🔒", text: "Enterprise-grade security" },
          { icon: "⚡", text: "Instant semantic search" },
          { icon: "🤖", text: "Multi-modal AI engine" },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 text-slate-400 text-xs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.12 }}
          >
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, borderColor, glowColor, delay,
}: {
  label: string; value: number; icon: string;
  borderColor: string; glowColor: string; delay: number;
}) {
  const count = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.05, y: -3 }}
      className="relative overflow-hidden rounded-2xl border p-4
                 bg-slate-900/80 backdrop-blur-sm cursor-default"
      style={{
        borderColor,
        boxShadow: `0 0 16px 2px ${glowColor}`,
      }}
    >
      <div className="absolute inset-0 opacity-8"
           style={{ background: `radial-gradient(circle at top left, ${glowColor}, transparent 70%)` }} />
      <div className="relative">
        <span className="text-2xl">{icon}</span>
        <p className="text-2xl font-black text-white mt-1">{count}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickBtn({
  icon, label, hint, onClick, accentBorder, delay,
}: {
  icon: string; label: string; hint: string;
  onClick: () => void; accentBorder: string; delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ scale: 1.03, x: 3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  bg-slate-900/70 border text-left
                  hover:bg-slate-800/70 transition-all duration-200`}
      style={{ borderColor: accentBorder }}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      </div>
    </motion.button>
  );
}

// ─── Recent document row ──────────────────────────────────────────────────────

const DOC_TYPE_ICON: Record<string, string> = {
  CONTRACT: "📝", INVOICE: "🧾", PURCHASE_ORDER: "📦",
  RECEIPT: "🧾", REPORT: "📊", POLICY: "📋", OTHER: "📄", UNKNOWN: "📄",
};
const STATUS_STYLES: Record<string, string> = {
  READY:            "bg-emerald-500/20 text-emerald-400",
  APPROVED:         "bg-emerald-500/20 text-emerald-400",
  PROCESSING:       "bg-yellow-500/20 text-yellow-400",
  ANALYZING:        "bg-yellow-500/20 text-yellow-400",
  EMBEDDING:        "bg-yellow-500/20 text-yellow-400",
  UPLOADED:         "bg-blue-500/20 text-blue-400",
  FAILED:           "bg-red-500/20 text-red-400",
  REVIEW_REQUIRED:  "bg-orange-500/20 text-orange-400",
  PENDING_APPROVAL: "bg-purple-500/20 text-purple-400",
};

function RecentDocRow({ doc, idx }: { doc: RecentDocument; idx: number }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7 + idx * 0.08, duration: 0.35 }}
      onClick={() => navigate(`/documents/${doc.id}`)}
      className="flex items-center justify-between px-4 py-3 rounded-xl
                 bg-slate-800/50 border border-slate-700/40 cursor-pointer
                 hover:bg-slate-800 hover:border-indigo-500/40 transition-all group"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl group-hover:scale-110 transition-transform">
          {DOC_TYPE_ICON[doc.document_type] ?? "📄"}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{doc.title}</p>
          <p className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0
                        ${STATUS_STYLES[doc.status] ?? "bg-slate-600/40 text-slate-400"}`}>
        {doc.status.replace("_", " ")}
      </span>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_documents: 0, processed_documents: 0,
    pending_approvals: 0, high_risk_documents: 0,
    approved_documents: 0, failed_documents: 0,
    total_conversations: 0, unread_notifications: 0,
  });
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [greeting, setGreeting]     = useState("Good day");
  const [tick, setTick]             = useState(0);

  // Greeting
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Fetch data
  useEffect(() => {
    dashboardApi.getDashboard()
      .then((res) => {
        setStats(res.data.stats);
        setRecentDocs(res.data.recent_docs ?? []);
      })
      .catch(() => {});
  }, []);

  // Live clock tick (for the "pulsing" badge)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const STAT_CARDS = [
    { label: "Documents",    value: stats.total_documents,      icon: "📄", borderColor: "rgba(99,102,241,0.35)",  glowColor: "rgba(99,102,241,0.12)",  delay: 0.1 },
    { label: "Processed",    value: stats.processed_documents,  icon: "✅", borderColor: "rgba(16,185,129,0.35)",  glowColor: "rgba(16,185,129,0.12)",  delay: 0.15 },
    { label: "Chats",        value: stats.total_conversations,  icon: "💬", borderColor: "rgba(139,92,246,0.35)",  glowColor: "rgba(139,92,246,0.12)",  delay: 0.2 },
    { label: "Pending",      value: stats.pending_approvals,    icon: "⏳", borderColor: "rgba(234,179,8,0.35)",   glowColor: "rgba(234,179,8,0.1)",    delay: 0.25 },
    { label: "High Risk",    value: stats.high_risk_documents,  icon: "⚠️", borderColor: "rgba(239,68,68,0.35)",   glowColor: "rgba(239,68,68,0.1)",    delay: 0.3 },
    { label: "Alerts",       value: stats.unread_notifications, icon: "🔔", borderColor: "rgba(59,130,246,0.35)",  glowColor: "rgba(59,130,246,0.1)",   delay: 0.35 },
  ];

  const QUICK_ACTIONS = [
    { icon: "⬆️", label: "Upload Document",   hint: "PDF · DOCX · Image",             route: "/upload",      accentBorder: "rgba(99,102,241,0.4)",  delay: 0.5 },
    { icon: "📄", label: "Browse Documents",  hint: `${stats.total_documents} files`,  route: "/documents",   accentBorder: "rgba(59,130,246,0.4)",  delay: 0.55 },
    { icon: "🔍", label: "Semantic Search",   hint: "Find by meaning",                route: "/search",      accentBorder: "rgba(139,92,246,0.4)",  delay: 0.6 },
    { icon: "🔀", label: "Compare Docs",      hint: "Side-by-side analysis",           route: "/comparisons", accentBorder: "rgba(245,158,11,0.4)",  delay: 0.65 },
    { icon: "📋", label: "Resume Upload",     hint: "AI analysis + skill gap",        route: "/resume",      accentBorder: "rgba(16,185,129,0.4)",  delay: 0.7 },
    { icon: "📚", label: "Exam Prep",         hint: "Syllabus · Mock tests",           route: "/exams",       accentBorder: "rgba(236,72,153,0.4)",  delay: 0.75 },
  ];

  return (
    <div className="relative min-h-full overflow-auto">

      {/* ── Background layers ─────────────────────────────────────── */}
      <Background />
      <Particles />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 py-8 max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <motion.div
          className="flex items-start justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-[0.2em]">
              {greeting},
            </p>
            <h1 className="text-4xl font-black text-white mt-1 animate-title-shimmer">
              {user?.username ?? "User"} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">
              Your AI workspace is live and ready.
            </p>
          </div>

          {/* Badge cluster */}
          <div className="flex flex-col gap-2 items-end">
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-slate-900/80 border border-emerald-500/30 text-xs text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI Online
            </motion.div>
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-slate-900/80 border border-indigo-500/30 text-xs text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              {user?.role ?? "EMPLOYEE"}
            </motion.div>
          </div>
        </motion.div>

        {/* ── Section divider ────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase animate-title-shimmer px-1">
            AI Core / Copilot
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        </motion.div>

        {/* ── AI CORE + 4 MODULE CARDS ──────────────────────────── */}
        {/*
         *  Layout (5 columns on large screens):
         *  col 1: card[0] top-left    col 3: center orb    col 5: card[1] top-right
         *  col 1: card[2] bottom-left col 3: center orb    col 5: card[3] bottom-right
         *
         *  Responsive: stacks to a 2x2 grid on mobile with orb above
         */}
        <div className="mb-8">

          {/* Mobile / tablet — orb on top, 2×2 cards below */}
          <div className="lg:hidden flex flex-col gap-5 items-center mb-4">
            <div className="w-full max-w-xs">
              <AICorePanel />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {MODULES.map((mod) => (
                <div key={mod.route} className="h-44">
                  <ModuleCard mod={mod} onClick={() => navigate(mod.route)} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop — 5-column symmetrical layout */}
          <div className="hidden lg:grid grid-cols-5 gap-5">

            {/* Col 1 — left cards */}
            <div className="col-span-1 flex flex-col gap-5">
              {/* top-left: General AI */}
              <div className="h-52">
                <ModuleCard mod={MODULES[0]} onClick={() => navigate(MODULES[0].route)} />
              </div>
              {/* bottom-left: Career AI */}
              <div className="h-52">
                <ModuleCard mod={MODULES[2]} onClick={() => navigate(MODULES[2].route)} />
              </div>
            </div>

            {/* Col 2 — left connector */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 120 450" fill="none" style={{ maxHeight: 450 }}>
                {/* Top beam — top-left card to orb */}
                <motion.path
                  d="M120,112 C60,112 60,225 0,225"
                  stroke="rgba(139,92,246,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="160"
                  strokeDashoffset="160"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ strokeDashoffset: [160, 0, 160], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0, ease: "easeInOut" }}
                />
                {/* Bottom beam — bottom-left card to orb */}
                <motion.path
                  d="M120,338 C60,338 60,225 0,225"
                  stroke="rgba(16,185,129,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="160"
                  strokeDashoffset="160"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ strokeDashoffset: [160, 0, 160], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.25, ease: "easeInOut" }}
                />
              </svg>
            </div>

            {/* Col 3 — Center AI Orb */}
            <div className="col-span-1 flex flex-col justify-center">
              <AICorePanel />
            </div>

            {/* Col 4 — right connector */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 120 450" fill="none" style={{ maxHeight: 450 }}>
                {/* Top beam — orb to top-right card */}
                <motion.path
                  d="M0,225 C60,225 60,112 120,112"
                  stroke="rgba(99,102,241,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="160"
                  strokeDashoffset="160"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ strokeDashoffset: [160, 0, 160], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.6, ease: "easeInOut" }}
                />
                {/* Bottom beam — orb to bottom-right card */}
                <motion.path
                  d="M0,225 C60,225 60,338 120,338"
                  stroke="rgba(245,158,11,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="160"
                  strokeDashoffset="160"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ strokeDashoffset: [160, 0, 160], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.85, ease: "easeInOut" }}
                />
              </svg>
            </div>

            {/* Col 5 — right cards */}
            <div className="col-span-1 flex flex-col gap-5">
              {/* top-right: Docs Chat */}
              <div className="h-52">
                <ModuleCard mod={MODULES[1]} onClick={() => navigate(MODULES[1].route)} />
              </div>
              {/* bottom-right: Analytics */}
              <div className="h-52">
                <ModuleCard mod={MODULES[3]} onClick={() => navigate(MODULES[3].route)} />
              </div>
            </div>

          </div>
        </div>

        {/* ── Stat counters ──────────────────────────────────────── */}
        <motion.p
          className="text-[11px] text-slate-600 uppercase tracking-[0.25em] font-bold mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          Workspace Stats
        </motion.p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {STAT_CARDS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Bottom: Quick Actions + Recent Docs ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Quick Actions */}
          <div>
            <motion.p
              className="text-[11px] text-slate-600 uppercase tracking-[0.25em] font-bold mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Quick Actions
            </motion.p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <QuickBtn
                  key={a.route}
                  icon={a.icon}
                  label={a.label}
                  hint={a.hint}
                  onClick={() => navigate(a.route)}
                  accentBorder={a.accentBorder}
                  delay={a.delay}
                />
              ))}
            </div>
          </div>

          {/* Recent Documents */}
          <div>
            <motion.div
              className="flex items-center justify-between mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-[11px] text-slate-600 uppercase tracking-[0.25em] font-bold">
                Recent Documents
              </p>
              <button
                onClick={() => navigate("/documents")}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all →
              </button>
            </motion.div>

            <div className="space-y-2">
              {recentDocs.length === 0 ? (
                <motion.div
                  className="rounded-2xl border border-slate-800/60 bg-slate-900/50
                             flex flex-col items-center justify-center py-12 gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="text-5xl">📂</span>
                  <p className="text-slate-500 text-sm">No documents yet.</p>
                  <button
                    onClick={() => navigate("/upload")}
                    className="text-xs px-5 py-2 rounded-full bg-indigo-600 text-white
                               hover:bg-indigo-500 transition-colors font-semibold"
                  >
                    Upload your first document
                  </button>
                </motion.div>
              ) : (
                recentDocs.slice(0, 6).map((doc, i) => (
                  <RecentDocRow key={doc.id} doc={doc} idx={i} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <motion.p
          className="text-center text-slate-800 text-xs mt-10 tracking-[0.3em] uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          DocuMind AI · {user?.role ?? "EMPLOYEE"} · All data encrypted at rest
        </motion.p>

      </div>
    </div>
  );
}
