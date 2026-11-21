import React, { useRef, useEffect, useState } from 'react'

const CERTS = [
  {
    title: 'Python for Data Science',
    issuer: 'IBM / Coursera',
    date: '2024',
    icon: '🐍',
    color: '#3776AB',
    badge: 'IBM',
    verified: true,
    link: '#'
  },
  {
    title: 'React – The Complete Guide',
    issuer: 'Udemy',
    date: '2024',
    icon: '⚛️',
    color: '#61DAFB',
    badge: 'Udemy',
    verified: true,
    link: '#'
  },
  {
    title: 'AI Fundamentals',
    issuer: 'IBM SkillsBuild',
    date: '2024',
    icon: '🤖',
    color: '#8B5CF6',
    badge: 'IBM',
    verified: true,
    link: '#'
  },
  {
    title: 'JavaScript Essentials',
    issuer: 'Cisco / NetAcad',
    date: '2024',
    icon: '⚡',
    color: '#F7DF1E',
    badge: 'Cisco',
    verified: true,
    link: '#'
  },
  {
    title: 'SQL & Database Design',
    issuer: 'Oracle Academy',
    date: '2023',
    icon: '🗄️',
    color: '#F80000',
    badge: 'Oracle',
    verified: true,
    link: '#'
  },
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

export default function Certifications() {
  const [ref, inView] = useInView()
  const [activeIdx, setActiveIdx] = useState(0)

  // Auto-scroll every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(i => (i + 1) % CERTS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section
      id="certifications"
      className="section"
      ref={ref}
      aria-labelledby="certifications-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            Certifications
          </div>
        </div>

        <h2 id="certifications-title" className="section-title">Certifications</h2>
        <p className="section-subtitle">Verified credentials from leading platforms</p>

        {/* Featured Cert */}
        <div
          className="glass-card"
          style={{
            padding: '40px',
            marginBottom: '32px',
            textAlign: 'center',
            opacity: inView ? 1 : 0,
            transition: 'all 0.7s ease',
            background: `linear-gradient(135deg, rgba(17,24,39,0.9), rgba(${
              CERTS[activeIdx].color === '#3776AB' ? '55,118,171' :
              CERTS[activeIdx].color === '#61DAFB' ? '97,218,251' : '59,130,246'
            },0.05))`,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }} aria-hidden="true">
            {CERTS[activeIdx].icon}
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
            {CERTS[activeIdx].title}
          </h3>
          <p style={{ color: '#94A3B8', marginBottom: '8px' }}>{CERTS[activeIdx].issuer}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '50px', fontSize: '0.8rem', color: '#22C55E', fontWeight: '600'
            }}>
              ✓ Verified
            </span>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', fontSize: '0.8rem', color: '#94A3B8'
            }}>
              {CERTS[activeIdx].date}
            </span>
            <span style={{
              padding: '4px 12px',
              background: `${CERTS[activeIdx].color}15`,
              border: `1px solid ${CERTS[activeIdx].color}30`,
              borderRadius: '50px', fontSize: '0.8rem', color: CERTS[activeIdx].color, fontWeight: '600'
            }}>
              {CERTS[activeIdx].badge}
            </span>
          </div>
          <a href={CERTS[activeIdx].link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: '0.85rem', padding: '10px 20px' }} aria-label={`View ${CERTS[activeIdx].title} certificate`}>
            View Certificate
          </a>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }} role="tablist" aria-label="Certificate navigation">
          {CERTS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activeIdx === i}
              aria-label={`View certificate ${i + 1}`}
              onClick={() => setActiveIdx(i)}
              style={{
                width: activeIdx === i ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: activeIdx === i ? '#3B82F6' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* All Certs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
        }} className="certs-grid">
          {CERTS.map((cert, i) => (
            <div
              key={cert.title}
              className="glass-card"
              style={{
                padding: '20px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.5s ease ${i * 0.08}s`,
                cursor: 'pointer',
                borderColor: activeIdx === i ? cert.color : undefined,
                boxShadow: activeIdx === i ? `0 0 20px ${cert.color}30` : undefined,
              }}
              onClick={() => setActiveIdx(i)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = cert.color
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                if (activeIdx !== i) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', flexShrink: 0,
                  background: `${cert.color}15`,
                  border: `1px solid ${cert.color}30`,
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem'
                }} aria-hidden="true">
                  {cert.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cert.title}
                  </p>
                  <p style={{ color: '#64748B', fontSize: '0.75rem' }}>{cert.issuer} · {cert.date}</p>
                </div>
                {cert.verified && (
                  <span style={{ color: '#22C55E', fontSize: '1rem', flexShrink: 0 }} aria-label="Verified">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .certs-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .certs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

