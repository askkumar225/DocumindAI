import React, { useEffect, useRef, useState } from 'react'
import profileImg from '../assets/Base_image.png'

const TYPING_TEXTS = [
  'Frontend Developer',
  'React Developer',
  'Python Developer',
  'Full Stack Learner',
]

const STATS = [
  { value: '10+', label: 'Projects' },
  { value: '20+', label: 'Technologies' },
  { value: '7.83', label: 'CGPA' },
  { value: '2026', label: 'Graduate' },
]

function useTypingEffect(texts, speed = 80, pause = 1800) {
  const [displayed, setDisplayed] = useState('')
  const [textIdx, setTextIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[textIdx]
    let timeout

    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), speed)
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2)
    } else if (deleting && charIdx === 0) {
      setDeleting(false)
      setTextIdx(i => (i + 1) % texts.length)
    }

    setDisplayed(current.substring(0, charIdx))
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, textIdx, texts, speed, pause])

  return displayed
}

export default function Hero() {
  const [count, setCount] = useState({ projects: 0, tech: 0 })
  const typedText = useTypingEffect(TYPING_TEXTS)
  const heroRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const duration = 2000
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      setCount({
        projects: Math.round(10 * progress),
        tech: Math.round(20 * progress),
      })
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [visible])

  const handleNavClick = (href) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      ref={heroRef}
      aria-label="Hero section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '80px',
      }}
    >
      {/* Background blobs */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
          borderRadius: '50%', top: '-150px', left: '-150px',
          animation: 'blob 10s infinite', filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
          borderRadius: '50%', bottom: '-80px', right: '-80px',
          animation: 'blob 12s infinite 3s', filter: 'blur(80px)'
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {/* Particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            borderRadius: '50%',
            background: i % 2 === 0 ? '#3B82F6' : '#06B6D4',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: Math.random() * 0.5 + 0.1,
            animation: `float ${Math.random() * 4 + 3}s ease-in-out infinite ${Math.random() * 3}s`
          }} />
        ))}
      </div>

      <div className="container" style={{ width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }}
          className="hero-grid"
        >
          {/* LEFT */}
          <div style={{ animation: visible ? 'slideInLeft 0.8s ease forwards' : 'none', opacity: visible ? 1 : 0 }}>
            {/* Greeting */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '50px',
              fontSize: '0.9rem', color: '#94A3B8', marginBottom: '20px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>👋</span>
              <span>Hi, I'm available for work</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0, boxShadow: '0 0 8px #22C55E' }} />
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: '900', lineHeight: 1.1, marginBottom: '8px' }}>
              I'm{' '}
              <span style={{
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'block'
              }}>
                ASHOK KUMAR
              </span>
            </h1>

            {/* Typing animation */}
            <div style={{ height: '44px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
              <span style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                fontWeight: '600',
                color: '#94A3B8'
              }}>
                {typedText}
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.2em',
                  background: '#3B82F6',
                  marginLeft: '2px',
                  animation: 'blink 1s step-end infinite',
                  verticalAlign: 'text-bottom'
                }} aria-hidden="true" />
              </span>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.8, marginBottom: '32px', maxWidth: '480px' }}>
              Building responsive and scalable web applications using{' '}
              <span style={{ color: '#3B82F6', fontWeight: '600' }}>React</span>,{' '}
              <span style={{ color: '#06B6D4', fontWeight: '600' }}>Django</span>, and modern web technologies.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button
                className="btn-primary"
                onClick={() => handleNavClick('#projects')}
                aria-label="View Projects"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/>
                </svg>
                View Projects
              </button>
              <a
                href="/resume.pdf"
                download
                className="btn-secondary"
                aria-label="Download Resume"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download Resume
              </a>
            </div>

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { href: 'https://github.com/ashok', label: 'GitHub', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                )},
                { href: 'https://linkedin.com/in/ashok', label: 'LinkedIn', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                )},
                { href: 'mailto:ashok@example.com', label: 'Email', icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
                  </svg>
                )},
              ].map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.label !== 'Email' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  style={{
                    width: '44px', height: '44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '12px',
                    color: '#94A3B8',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(59,130,246,0.2)'
                    e.currentTarget.style.borderColor = '#3B82F6'
                    e.currentTarget.style.color = '#3B82F6'
                    e.currentTarget.style.transform = 'translateY(-3px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
                    e.currentTarget.style.color = '#94A3B8'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px', marginTop: '48px', paddingTop: '32px',
              borderTop: '1px solid rgba(255,255,255,0.08)'
            }} className="stats-grid">
              {STATS.map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1
                  }}>{stat.value}</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Open to Work badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)', borderRadius: '50px',
              fontSize: '0.8rem', color: '#22C55E', marginTop: '20px', fontWeight: '600'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', animation: 'pulse-ring 1.5s ease-out infinite' }} aria-hidden="true" />
              Open To Work
            </div>
          </div>

          {/* RIGHT – Profile Image */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: visible ? 'slideInRight 0.8s ease forwards' : 'none',
              opacity: visible ? 1 : 0,
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative', width: '340px', height: '340px' }} aria-hidden="true">
              {/* Gradient ring */}
              <div style={{
                position: 'absolute', inset: '-8px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4, #3B82F6)',
                backgroundSize: '200% 200%',
                animation: 'spin-slow 8s linear infinite, gradient-shift 4s ease infinite',
                padding: '4px'
              }} />
              {/* Pulse rings */}
              <div style={{
                position: 'absolute', inset: '-20px',
                borderRadius: '50%',
                border: '1px solid rgba(59,130,246,0.3)',
                animation: 'pulse-ring 2s ease-out infinite'
              }} />
              <div style={{
                position: 'absolute', inset: '-40px',
                borderRadius: '50%',
                border: '1px solid rgba(59,130,246,0.15)',
                animation: 'pulse-ring 2s ease-out infinite 0.5s'
              }} />
              {/* Glass circle + Image */}
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: 'var(--glass)',
                backdropFilter: 'blur(10px)',
                border: '3px solid rgba(59,130,246,0.4)',
                overflow: 'hidden',
                boxShadow: '0 0 60px rgba(6,182,212,0.40), 0 0 120px rgba(59,130,246,0.20)',
                animation: 'float 4s ease-in-out infinite',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1
              }}>
                {/* Placeholder avatar – replace with actual image */}
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #1E3A5F, #0B1120)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '8px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={profileImg}
                    alt="Ashok Kumar - Frontend Developer"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover', objectPosition: 'top center',
                      borderRadius: '50%'
                    }}
                    onError={e => {
                      e.target.style.display = 'none'
                      e.target.parentNode.innerHTML = '<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#06B6D4);display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:900;color:white">AK</div>'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          animation: 'float 2s ease-in-out infinite'
        }}
        aria-hidden="true"
      >
        <p style={{ color: '#94A3B8', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Scroll</p>
        <div style={{
          width: '24px', height: '40px',
          border: '2px solid rgba(59,130,246,0.4)',
          borderRadius: '12px',
          display: 'flex', justifyContent: 'center', paddingTop: '6px'
        }}>
          <div style={{
            width: '4px', height: '8px',
            background: '#3B82F6', borderRadius: '2px',
            animation: 'float 1.5s ease-in-out infinite'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes blob {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
          .hero-grid > div:last-child { order: -1; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
