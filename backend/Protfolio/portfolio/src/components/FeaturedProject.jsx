import React, { useRef, useEffect, useState } from 'react'

const FEATURES = [
  { icon: '⚛️', text: 'React Frontend' },
  { icon: '🎸', text: 'Django Backend' },
  { icon: '🔌', text: 'REST API' },
  { icon: '🔐', text: 'Authentication' },
  { icon: '📅', text: 'Booking System' },
  { icon: '📱', text: 'Responsive Design' },
  { icon: '⚙️', text: 'Admin Dashboard' },
  { icon: '🖼️', text: 'Gallery' },
  { icon: '📬', text: 'Contact Form' },
]

function useInView(threshold = 0.1) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

export default function FeaturedProject() {
  const [ref, inView] = useInView()

  return (
    <section id="projects" className="section" ref={ref} aria-labelledby="featured-project-title">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            Featured Project
          </div>
        </div>

        <h2 id="featured-project-title" className="section-title">Flagship Project</h2>
        <p className="section-subtitle">My best full-stack project — built with React, Django, and REST API</p>

        <div
          className="glass-card"
          style={{
            overflow: 'hidden',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.8s ease',
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
          }} className="featured-grid">
            {/* Left – Screenshot */}
            <div style={{
              background: 'linear-gradient(135deg, #1a2744, #0B1120)',
              minHeight: '400px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
              borderRight: '1px solid rgba(59,130,246,0.15)'
            }}>
              {/* Decorative screenshot mockup */}
              <div style={{
                width: '85%',
                background: 'rgba(17,24,39,0.8)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}>
                {/* Browser bar */}
                <div style={{
                  background: 'rgba(30,40,60,0.9)',
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: '1px solid rgba(59,130,246,0.15)'
                }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} aria-hidden="true" />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} aria-hidden="true" />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E' }} aria-hidden="true" />
                  <div style={{
                    flex: 1, marginLeft: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px', padding: '4px 10px',
                    fontSize: '0.7rem', color: '#94A3B8'
                  }}>lakshadweep-tourism.vercel.app</div>
                </div>
                {/* Content mockup */}
                <div style={{
                  padding: '24px',
                  background: 'linear-gradient(135deg, #0B1120, #1E3A5F)',
                  minHeight: '300px',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem' }} aria-hidden="true">🏝️</div>
                  <h3 style={{
                    fontSize: '1.3rem', fontWeight: '800', color: 'white',
                    background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                  }}>Lakshadweep Tourism</h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem', maxWidth: '260px', lineHeight: 1.6 }}>
                    Full-stack tourism website with React frontend, Django backend & booking system
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['React', 'Django', 'REST API'].map(tag => (
                      <span key={tag} style={{
                        padding: '4px 10px', background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: '50px', fontSize: '0.7rem', color: '#3B82F6'
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow */}
              <div aria-hidden="true" style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
            </div>

            {/* Right – Details */}
            <div style={{ padding: '48px 40px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '50px', fontSize: '0.75rem', color: '#3B82F6', fontWeight: '600', marginBottom: '16px'
              }}>
                🏆 Full Stack Project
              </div>

              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white', marginBottom: '16px' }}>
                Lakshadweep Tourism
              </h3>

              <p style={{ color: '#94A3B8', lineHeight: 1.8, marginBottom: '28px' }}>
                A complete full-stack tourism platform for Lakshadweep featuring user authentication, island listing, tour booking, admin dashboard, media gallery, and contact functionality — built with React and Django REST Framework.
              </p>

              {/* Features */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px', marginBottom: '32px'
              }} className="features-mini-grid">
                {FEATURES.map(f => (
                  <div key={f.text} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    fontSize: '0.78rem', color: '#CBD5E1'
                  }}>
                    <span aria-hidden="true">{f.icon}</span> {f.text}
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href="https://lakshadweep-tourism.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  aria-label="View Live Demo of Lakshadweep Tourism"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Live Demo
                </a>
                <a
                  href="https://github.com/ashok/lakshadweep-tourism"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  aria-label="View GitHub source code"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <button
                  className="btn-secondary"
                  onClick={() => alert('Case study coming soon!')}
                  aria-label="Read case study"
                  style={{ border: '2px solid rgba(6,182,212,0.5)', color: '#06B6D4' }}
                >
                  📖 Case Study
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .featured-grid { grid-template-columns: 1fr !important; }
          .featured-grid > div:first-child { min-height: 280px !important; }
          .features-mini-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .features-mini-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}

