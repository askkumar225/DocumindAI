/**
 * AIHub — Full-screen immersive AI home
 *
 * No navbar. No sidebar. The entire viewport is the product.
 *
 * Layout:
 *   • Animated dark background (grid + particles + nebulae)
 *   • Top bar: brand logo  ·  notification dot  ·  user avatar + logout
 *   • Hero: greeting + subtitle
 *   • Search bar: "Ask DocuMind anything…"
 *   • 2×2 portal grid: General AI · Document Chat · Career AI · Analytics
 *   • Footer watermark
 *
 * Interactions:
 *   • Hover → card glows, slightly expands, shows sub-links
 *   • Click  → full-screen portal expansion overlay, then navigate
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/authStore";
import authApi from "../services/authApi";

// ─── Floating particles ───────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1.5,
  dur: Math.random() * 9 + 7,
  delay: Math.random() * 6,
  color: [
    "rgba(129,140,248,0.55)",
    "rgba(167,139,250,0.45)",
    "rgba(196,181,253,0.35)",
    "rgba(99,102,241,0.5)",
    "rgba(240,171,252,0.35)",
  ][Math.floor(Math.random() * 5)],
}));

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size * 4,
            height: p.size * 4,
            background: p.color,
            boxShadow: `0 0 ${p.size * 7}px ${p.size * 2}px ${p.color}`,
          }}
          animate={{ y: [0, -32, 0], x: [0, 14, 0], opacity: [0.25, 0.85, 0.25], scale: [1, 1.35, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#020611]" />
      <div className="absolute inset-0 dash-grid-bg opacity-100" />
      {/* Corner nebulae */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full
                      bg-indigo-900/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full
                      bg-violet-900/18 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[900px] h-[500px] rounded-full bg-indigo-950/25 blur-[140px]" />
    </div>
  );
}

// ─── Portal definitions ───────────────────────────────────────────────────────

interface Portal {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  links: { label: string; route: string }[];
  route: string;
  gradient: string;
  border: string;
  glow: string;
  glowRgb: string;
  textAccent: string;
  bgAccent: string;
  floatDelay: string;
}

const PORTALS: Portal[] = [
  {
    id: "general",
    icon: "✨",
    title: "GENERAL AI",
    subtitle: "Ask anything · Create · Learn",
    description: "Your AI assistant for any question, creative task, code, or research.",
    links: [
      { label: "Start chatting", route: "/ai" },
      { label: "Recent chats",  route: "/ai" },
    ],
    route: "/ai",
    gradient: "from-violet-600/30 via-indigo-700/20 to-transparent",
    border: "rgba(139,92,246,0.45)",
    glow: "rgba(139,92,246,0.35)",
    glowRgb: "139,92,246",
    textAccent: "#a78bfa",
    bgAccent: "rgba(139,92,246,0.12)",
    floatDelay: "0s",
  },
  {
    id: "docs",
    icon: "💬",
    title: "DOCUMENT CHAT",
    subtitle: "Talk to your documents",
    description: "Upload PDFs, contracts or reports and ask questions in plain language.",
    links: [
      { label: "Chat with a doc", route: "/chat" },
      { label: "Upload new doc",  route: "/upload" },
      { label: "Search docs",     route: "/search" },
    ],
    route: "/chat",
    gradient: "from-indigo-600/30 via-blue-700/20 to-transparent",
    border: "rgba(99,102,241,0.45)",
    glow: "rgba(99,102,241,0.35)",
    glowRgb: "99,102,241",
    textAccent: "#818cf8",
    bgAccent: "rgba(99,102,241,0.12)",
    floatDelay: "1s",
  },
  {
    id: "career",
    icon: "🚀",
    title: "CAREER AI",
    subtitle: "Resume · Jobs · Interview",
    description: "AI-powered resume analysis, job matching, cover letters and mock interviews.",
    links: [
      { label: "Analyse resume",  route: "/resume" },
      { label: "Match jobs",      route: "/job-match" },
      { label: "Mock interview",  route: "/interview" },
    ],
    route: "/resume",
    gradient: "from-emerald-600/30 via-teal-700/20 to-transparent",
    border: "rgba(16,185,129,0.45)",
    glow: "rgba(16,185,129,0.35)",
    glowRgb: "16,185,129",
    textAccent: "#34d399",
    bgAccent: "rgba(16,185,129,0.12)",
    floatDelay: "2s",
  },
  {
    id: "analytics",
    icon: "📊",
    title: "ANALYTICS",
    subtitle: "Insights · Risks · Reports",
    description: "Understand your document landscape with AI-powered risk and trend analysis.",
    links: [
      { label: "View insights",   route: "/analytics" },
      { label: "Risk dashboard",  route: "/analytics" },
    ],
    route: "/analytics",
    gradient: "from-amber-600/30 via-orange-700/20 to-transparent",
    border: "rgba(245,158,11,0.45)",
    glow: "rgba(245,158,11,0.35)",
    glowRgb: "245,158,11",
    textAccent: "#fbbf24",
    bgAccent: "rgba(245,158,11,0.12)",
    floatDelay: "1.5s",
  },
];

// ─── Portal card ──────────────────────────────────────────────────────────────

function PortalCard({
  portal,
  onEnter,
  index,
}: {
  portal: Portal;
  onEnter: (portal: Portal, rect: DOMRect) => void;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  function handleClick() {
    if (ref.current) {
      onEnter(portal, ref.current.getBoundingClientRect());
    }
  }

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, scale: 0.88, y: 32 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.5 + index * 0.1,
        duration: 0.65,
        type: "spring",
        stiffness: 160,
        damping: 20,
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
      className="relative overflow-hidden rounded-3xl text-left w-full h-full
                 bg-slate-900/70 backdrop-blur-xl cursor-pointer
                 transition-shadow duration-300 focus:outline-none"
      style={{
        border: `1px solid ${hovered ? portal.border : portal.border.replace("0.45", "0.2")}`,
        boxShadow: hovered
          ? `0 0 50px 8px ${portal.glow}, 0 16px 48px rgba(0,0,0,0.5), inset 0 0 30px rgba(${portal.glowRgb},0.06)`
          : `0 0 14px 2px ${portal.glow.replace("0.35", "0.1")}, 0 6px 20px rgba(0,0,0,0.35)`,
        transform: hovered ? "scale(1.035) translateY(-6px)" : "scale(1) translateY(0)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, border-color 0.25s ease",
        animation: `cardFloat 5s ease-in-out ${portal.floatDelay} infinite`,
      }}
    >
      {/* Gradient fill */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} transition-opacity duration-400`}
        style={{ opacity: hovered ? 1 : 0.6 }}
      />

      {/* Top shimmer line */}
      <div className="absolute top-0 left-6 right-6 h-px"
           style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,${hovered ? "0.25" : "0.08"}), transparent)` }} />

      {/* Corner accent glow */}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-bl-full"
           style={{ background: `radial-gradient(circle at top right, rgba(${portal.glowRgb},${hovered ? "0.25" : "0.1"}), transparent 70%)` }} />

      {/* Hover scan sweep */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute left-0 right-0 h-[1px] pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, rgba(${portal.glowRgb},0.7), transparent)` }}
            initial={{ top: 0, opacity: 0 }}
            animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 p-7 flex flex-col h-full gap-4">
        {/* Icon */}
        <div className="relative w-14 h-14">
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ background: portal.bgAccent }}
              animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: portal.bgAccent,
              border: `1px solid rgba(${portal.glowRgb},0.3)`,
              boxShadow: hovered ? `0 0 20px 4px rgba(${portal.glowRgb},0.3)` : "none",
              transition: "box-shadow 0.3s ease",
            }}
          >
            {portal.icon}
          </div>
        </div>

        {/* Title + subtitle */}
        <div>
          <h3
            className="text-xl font-black tracking-tight text-white"
            style={{ textShadow: hovered ? `0 0 20px rgba(${portal.glowRgb},0.6)` : "none" }}
          >
            {portal.title}
          </h3>
          <p className="text-sm mt-1 font-medium" style={{ color: portal.textAccent }}>
            {portal.subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed flex-1">
          {portal.description}
        </p>

        {/* Sub-links — appear on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="flex flex-col gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
            >
              {portal.links.map((link) => (
                <motion.div
                  key={link.route + link.label}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg w-fit"
                  style={{ background: portal.bgAccent, color: portal.textAccent }}
                  whileHover={{ x: 4 }}
                  onClick={(e) => { e.stopPropagation(); onEnter(portal, (ref.current?.getBoundingClientRect() ?? new DOMRect())); }}
                >
                  <span>→</span> {link.label}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enter arrow */}
        <motion.div
          className="flex items-center gap-2 text-sm font-bold mt-auto"
          style={{ color: portal.textAccent }}
          animate={{ x: hovered ? 6 : 0 }}
          transition={{ duration: 0.25 }}
        >
          Enter
          <motion.span animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.5 }}>
            →
          </motion.span>
        </motion.div>
      </div>
    </motion.button>
  );
}

// ─── Portal transition overlay ────────────────────────────────────────────────

function PortalOverlay({
  portal,
  rect,
  onDone,
}: {
  portal: Portal;
  rect: DOMRect;
  onDone: () => void;
}) {
  // Start from the card's position, expand to full-screen
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ clipPath: `circle(0px at ${startX}px ${startY}px)` }}
      animate={{ clipPath: `circle(200vmax at ${startX}px ${startY}px)` }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onDone}
      style={{ background: `radial-gradient(circle at ${startX}px ${startY}px, rgba(${portal.glowRgb},0.95) 0%, #020611 60%)` }}
    >
      {/* Center icon pulse */}
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <span className="text-7xl">{portal.icon}</span>
        <p className="text-white text-xl font-black tracking-widest">{portal.title}</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) onSearch(query.trim());
  }

  return (
    <motion.div
      className="relative w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.55 }}
    >
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          border: `1px solid ${focused ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.2)"}`,
          boxShadow: focused
            ? "0 0 40px 6px rgba(99,102,241,0.25), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 0 16px 2px rgba(99,102,241,0.08), 0 4px 16px rgba(0,0,0,0.3)",
          background: "rgba(10,14,30,0.85)",
        }}
      >
        {/* Left icon */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 opacity-70">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder="Ask DocuMind anything — search, analyse, create or learn…"
          className="w-full bg-transparent text-white placeholder-slate-600 text-base
                     pl-14 pr-16 py-5 outline-none font-medium"
        />

        {/* Right: send button */}
        <motion.button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl
                     flex items-center justify-center text-white font-bold"
          style={{
            background: query.trim()
              ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
              : "rgba(99,102,241,0.15)",
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => query.trim() && onSearch(query.trim())}
          animate={{ opacity: query.trim() ? 1 : 0.4 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2 15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>

      {/* Typing glow ripple */}
      {focused && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: "1px solid rgba(99,102,241,0.4)" }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      className="flex items-center justify-between px-8 py-5"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
          animate={{ boxShadow: ["0 0 10px rgba(99,102,241,0.4)", "0 0 20px rgba(99,102,241,0.7)", "0 0 10px rgba(99,102,241,0.4)"] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          ✦
        </motion.div>
        <span className="text-lg font-black animate-title-shimmer tracking-tight">
          DOCUMIND AI
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <motion.button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center
                     bg-slate-900/60 border border-slate-700/40 text-slate-400
                     hover:text-white hover:border-indigo-500/40 transition-all"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/dashboard")}
        >
          🔔
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                           bg-indigo-500 border-2 border-[#020611]" />
        </motion.button>

        {/* User menu */}
        <div className="relative">
          <motion.button
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                       bg-slate-900/60 border border-slate-700/40
                       hover:border-indigo-500/40 transition-all"
            whileHover={{ scale: 1.03 }}
            onClick={() => setShowMenu((v) => !v)}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm
                         font-black text-white uppercase"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {user?.username?.charAt(0) ?? "U"}
            </div>
            <span className="text-sm font-semibold text-slate-200">
              {user?.username ?? "User"}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-500">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="absolute right-0 top-12 w-44 rounded-2xl overflow-hidden z-50
                           bg-slate-900 border border-slate-700/50 shadow-2xl"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                {[
                  { icon: "▦", label: "Dashboard", action: () => { navigate("/dashboard"); setShowMenu(false); } },
                  { icon: "📄", label: "Documents",  action: () => { navigate("/documents"); setShowMenu(false); } },
                  { icon: "⚙",  label: "Settings",   action: () => setShowMenu(false) },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300
                               hover:bg-slate-800 hover:text-white transition-colors text-left"
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
                <div className="border-t border-slate-800" />
                <button
                  onClick={() => { setShowMenu(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400
                             hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                >
                  <span>→</span> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pulsing orb decoration (behind hero text) ───────────────────────────────

function HeroOrb() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none z-0">
      {[180, 260, 340].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-indigo-500/10"
          style={{
            width: size, height: size,
            left: -(size / 2), top: -(size / 4),
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}
      <div
        className="absolute w-32 h-32 rounded-full blur-3xl"
        style={{
          background: "rgba(99,102,241,0.25)",
          left: -64, top: -32,
        }}
      />
    </div>
  );
}

// ─── Main AIHub ───────────────────────────────────────────────────────────────

export default function AIHub() {
  const { user, refreshToken, logout } = useAuth();
  const navigate = useNavigate();

  const [transitioning, setTransitioning] = useState(false);
  const [activePortal, setActivePortal] = useState<Portal | null>(null);
  const [portalRect, setPortalRect] = useState<DOMRect | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTransitioning(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
    navigate("/login");
  }

  function handlePortalEnter(portal: Portal, rect: DOMRect) {
    if (transitioning) return;
    setActivePortal(portal);
    setPortalRect(rect);
    setTransitioning(true);
  }

  function handleOverlayDone() {
    if (activePortal) {
      navigate(activePortal.route);
    }
  }

  function handleSearch(q: string) {
    // Route to General AI with pre-filled query
    navigate(`/ai?q=${encodeURIComponent(q)}`);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <Background />
      <Particles />

      {/* Everything sits above background */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Top bar ──────────────────────────────────────────── */}
        <TopBar onLogout={handleLogout} />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center text-center px-6 pt-6 pb-8">
          <HeroOrb />

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mb-2">
              {greeting},
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              <span className="text-white">Welcome back, </span>
              <span className="animate-title-shimmer">{user?.username ?? "there"}</span>
              <span className="text-white"> 👋</span>
            </h1>
            <p className="text-slate-500 text-base mt-3 font-medium max-w-md mx-auto">
              Your intelligent AI workspace — search, analyse, create and learn.
            </p>
          </motion.div>

          {/* Search bar */}
          <div className="relative z-10 w-full mt-8">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        {/* ── 2×2 Portal Grid ──────────────────────────────────── */}
        <div className="relative z-10 flex-1 px-6 pb-6">
          <div className="max-w-5xl mx-auto h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 h-full" style={{ minHeight: 380 }}>
              {PORTALS.map((portal, i) => (
                <PortalCard
                  key={portal.id}
                  portal={portal}
                  onEnter={handlePortalEnter}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <motion.p
          className="relative z-10 text-center text-slate-800 text-xs
                     tracking-[0.3em] uppercase pb-5 font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          ✦ AI-powered workspace · Your documents · Your data · Encrypted ✦
        </motion.p>
      </div>

      {/* ── Full-screen portal transition overlay ──────────────── */}
      <AnimatePresence>
        {transitioning && activePortal && portalRect && (
          <PortalOverlay
            portal={activePortal}
            rect={portalRect}
            onDone={handleOverlayDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
