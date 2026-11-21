import React, { useRef, useEffect, useState } from 'react'

const REASONS = [
  {
    icon: '⚡',
    title: 'Quick Learner',
    desc: 'I adapt fast to new technologies, frameworks, and team workflows. I went from HTML to full-stack Django in under a year.',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    glow: 'rgba(59,130,246,0.3)',
  },
  {
    icon: '🧩',
    title: 'Problem Solver',
    desc: 'I break complex problems into manageable steps. I approach bugs and challenges with patience and analytical thinking.',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    glow: 'rgba(6,182,212,0.3)',
  },
  {
    icon: '🤝',
    title: 'Team Collaboration',
    desc: 'I work well in teams, communicate clearly, and contribute effectively. I use Git/GitHub for version-controlled workflows.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    glow: 'rgba(139,92,246,0.3)',
  },
  {
    icon: '📱',
    title: 'Responsive UI',
    desc: 'Every UI I build works flawlessly on mobile, tablet, and desktop. Pixel-perfect implementation is a priority for me.',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    glow: 'rgba(16,185,129,0.3)',
  },
  {
    icon: '✨',
    title: 'Clean Code',
    desc: 'I write readable, maintainable code with proper structure, comments, and best practices. Quality over quantity.',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    glow: 'rgba(245,158,11,0.3)',
  },
  {
    icon: '📚',
    title: 'Continuous Learning',
    desc: 'I stay updated with the latest trends, complete certifications, and build projects to sharpen my skills constantly.',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    glow: 'rgba(239,68,68,0.3)',
  },
]

function useInView(threshold = 0.1) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

function TiltCard({ children, style, className, gradient, glow }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotX = ((y - cy) / cy) * -6
    const rotY = ((x - cx) / cx) * 6
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px) scale(1.02)`
    card.style.boxShadow = `0 20px 40px ${glow}`
  }

  const handleMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)'
      ref.current.style.boxShadow = ''
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, transformStyle: 'preserve-3d', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

export default function WhyHireMe() {
  const [ref, inView] = useInView()

  return (
    <section
      id="why-hire"
      className="section"
      ref={ref}
      style={{ background: 'rgba(17,24,39,0.3)' }}
      aria-labelledby="why-hire-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            Why Choose Me
          </div>
        </div>

        <h2 id="why-hire-title" className="section-title">Why Hire Me?</h2>
        <p className="section-subtitle">Instead of generic services — here's what I genuinely bring to the table</p>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}
          className="why-hire-grid"
        >
          {REASONS.map((reason, i) => (
            <TiltCard
              key={reason.title}
              className="glass-card"
              gradient={reason.gradient}
              glow={reason.glow}
              style={{
                padding: '28px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top gradient bar */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: reason.gradient,
                }}
              />

              {/* Icon */}
              <div style={{
                width: '56px', height: '56px',
                background: reason.gradient,
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', marginBottom: '20px',
                boxShadow: `0 8px 20px rgba(0,0,0,0.3)`,
              }} aria-hidden="true">
                {reason.icon}
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '12px' }}>
                {reason.title}
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {reason.desc}
              </p>
            </TiltCard>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .why-hire-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .why-hire-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

