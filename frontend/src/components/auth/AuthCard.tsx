/**
 * AuthCard
 *
 * Frosted-glass card container with entrance animation.
 * Slides up from translateY(28px) + fade-in on mount.
 */

import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="
        relative w-full max-w-md
        bg-white/5 backdrop-blur-xl
        border border-white/10
        rounded-2xl shadow-2xl shadow-black/40
        p-8
      "
    >
      {/* Top edge highlight */}
      <div className="absolute top-0 left-8 right-8 h-px
                      bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
      {children}
    </motion.div>
  );
}
