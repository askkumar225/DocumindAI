/**
 * ChatButton
 *
 * Floating bottom-right button that opens the chatbot.
 * Features:
 *   - Pulse glow ring
 *   - Scale-up on hover
 *   - Tooltip on hover
 *   - Entrance animation
 */

import { useState } from "react";
import { motion } from "framer-motion";

interface ChatButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export default function ChatButton({ onClick, hasUnread = false }: ChatButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5, type: "spring", stiffness: 200 }}
    >
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
        transition={{ duration: 0.15 }}
        className="bg-slate-800/90 backdrop-blur-sm border border-white/10
                   text-white text-xs font-medium px-3 py-1.5 rounded-lg
                   whitespace-nowrap pointer-events-none"
      >
        AI Assistant
      </motion.div>

      {/* Button */}
      <div className="relative">
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/30
                        animate-ping pointer-events-none" />
        {/* Secondary glow */}
        <div className="absolute inset-0 rounded-full animate-orb-pulse
                        bg-indigo-600/20 blur-sm pointer-events-none" />

        <motion.button
          onClick={onClick}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.93 }}
          aria-label="Open DocuMind AI assistant"
          className="relative w-14 h-14 rounded-full
                     bg-gradient-to-br from-indigo-600 to-violet-700
                     shadow-[0_4px_20px_rgba(99,102,241,0.55)]
                     flex items-center justify-center
                     border border-white/20 cursor-pointer
                     focus:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-400"
        >
          {/* Icon */}
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            {/* Sparkle / AI icon */}
            <circle cx="13" cy="13" r="7" stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.2" fill="none"/>
            <circle cx="13" cy="13" r="3" fill="white" fillOpacity="0.9"/>
            <line x1="13" y1="4" x2="13" y2="1.5"
                  stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="22" x2="13" y2="24.5"
                  stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="4"  y1="13" x2="1.5" y2="13"
                  stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22" y1="13" x2="24.5" y2="13"
                  stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="7"  y1="7"  x2="5.5"  y2="5.5"
                  stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="19" y1="7"  x2="20.5" y2="5.5"
                  stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="7"  y1="19" x2="5.5"  y2="20.5"
                  stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="19" y1="19" x2="20.5" y2="20.5"
                  stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>

          {/* Unread dot */}
          {hasUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
                            bg-emerald-400 border-2 border-slate-900" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
