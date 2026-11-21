/**
 * AnimatedBackground
 *
 * Full-screen layered background for auth pages:
 *   1. Deep gradient base
 *   2. Moving grid overlay
 *   3. Large blurred floating orbs
 *   4. Small floating particles
 */

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      {/* ── 1. Base gradient ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />

      {/* ── 2. Moving grid ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 auth-grid-bg opacity-60" />

      {/* ── 3. Large blurred floating orbs ────────────────────────────────── */}
      {/* Top-left orb */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full
                   bg-indigo-600/20 blur-3xl animate-float"
        style={{ animationDelay: "0s" }}
      />
      {/* Top-right orb */}
      <div
        className="absolute -top-20 right-10 w-80 h-80 rounded-full
                   bg-violet-600/15 blur-3xl animate-float-slow"
        style={{ animationDelay: "2s" }}
      />
      {/* Bottom-left orb */}
      <div
        className="absolute bottom-10 -left-20 w-72 h-72 rounded-full
                   bg-blue-600/15 blur-3xl animate-float"
        style={{ animationDelay: "4s" }}
      />
      {/* Bottom-right orb */}
      <div
        className="absolute -bottom-20 right-20 w-96 h-96 rounded-full
                   bg-purple-700/20 blur-3xl animate-float-slow"
        style={{ animationDelay: "1s" }}
      />
      {/* Centre orb */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2
                   w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl animate-float"
        style={{ animationDelay: "3s" }}
      />

      {/* ── 4. Small floating particles ───────────────────────────────────── */}
      <Particle className="top-[15%] left-[12%] animate-particle-1" size={3} delay="0s" />
      <Particle className="top-[25%] left-[30%] animate-particle-2" size={2} delay="0.8s" />
      <Particle className="top-[10%] right-[20%] animate-particle-1" size={4} delay="1.5s" />
      <Particle className="top-[40%] left-[8%]  animate-particle-3" size={2} delay="0.3s" />
      <Particle className="top-[60%] left-[20%] animate-particle-2" size={3} delay="2s" />
      <Particle className="top-[70%] right-[15%] animate-particle-1" size={2} delay="1s" />
      <Particle className="bottom-[20%] left-[40%] animate-particle-3" size={4} delay="0.5s" />
      <Particle className="bottom-[30%] right-[30%] animate-particle-2" size={2} delay="1.8s" />
      <Particle className="top-[50%] right-[10%] animate-particle-1" size={3} delay="2.5s" />
      <Particle className="top-[80%] left-[60%] animate-particle-3" size={2} delay="0.7s" />
    </div>
  );
}

function Particle({
  className,
  size,
  delay,
}: {
  className: string;
  size: number;
  delay: string;
}) {
  return (
    <div
      className={`absolute rounded-full bg-indigo-400/50 ${className}`}
      style={{
        width: size * 4,
        height: size * 4,
        animationDelay: delay,
        boxShadow: `0 0 ${size * 3}px ${size}px rgba(129,140,248,0.4)`,
      }}
    />
  );
}
