import React, { useRef, useEffect, useState } from 'react'

const ACHIEVEMENTS = [
  {
    icon: '🏆',
    title: '10+ Projects Built',
    desc: 'Completed 10+ real-world projects spanning frontend, backend, and full-stack development.',
    color: '#F59E0B',
    stat: '10+'
  },
  {
    icon: '💻',
    title: '20+ Technologies',
    desc: 'Proficient in 20+ technologies including React, Python, Django, MySQL, REST APIs, and more.',
    color: '#3B82F6',
    stat: '20+'
  },
  {
    icon: '📜',
    title: 'IBM Coding Assessment',
    desc: 'Successfully completed IBM\'s coding assessment, demonstrating strong programming fundamentals.',
    color: '#1F70C1',
    stat: 'IBM'
  },
  {
    icon: '⚛️',
    title: 'React Projects',
    desc: 'Built 8+ React applications including SPAs, e-commerce apps, dashboards, and portfolio sites.',
    color: '#61DAFB',
    stat: '8+'
  },
  {
    icon: '🐍',
    title: 'Python Projects',
    desc: 'Developed multiple Python projects including automation scripts, Django APIs, and ML applications.',
    color: '#22C55E',
    stat: '5+'
  },
  {
    icon: '🌐',
    title: 'Open Source Learning',
    desc: 'Actively learning open source practices, contributing to projects, and building in public on GitHub.',
    color: '#8B5CF6',
    stat: 'Active'
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

export default function Achievements() {
  const [ref, inView] = useInView()

  return (
    <section
      id="achievements"
      className="section"
      ref={ref}
      style={{ background: 'rgba(17,24,39,0.3)' }}
      aria-labelledby="achievements-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            Achievements
          </div>
        </div>

        <h2 id="achievements-title" className="section-title">Achievements</h2>
        <p className="section-subtitle">Milestones, accomplishments and proud moments from my journey</p>

        {/* Hero stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0', marginBottom: '48px',
          background: 'rgba(17,24,39,0.8)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '20px', overflow: 'hidden'
        }} className="achieve-stats-bar">
          {[
            { value: '10+', label: 'Projects', icon: '🚀' },
            { value: '20+', label: 'Technologies', icon: '⚡' },
            { value: '7.83', label: 'CGPA', icon: '📚' },
            { value: '2026', label: 'Graduate', icon: '🎓' },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '28px 20px', textAlign: 'center',
                borderRight: i < 3 ? '1px solid rgba(59,130,246,0.15)' : 'none',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.5s ease ${i * 0.1}s`
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }} aria-hidden="true">{item.icon}</div>
              <div style={{
                fontSize: '2rem', fontWeight: '900',
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                lineHeight: 1
              }}>
                {item.value}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Achievement Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }} className="achieve-grid">
          {ACHIEVEMENTS.map((ach, i) => (
            <div
              key={ach.title}
              className="glass-card"
              style={{
                padding: '28px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease ${i * 0.1}s`,
                position: 'relative', overflow: 'hidden'
              }}
            >
              {/* Background stat */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: '12px', right: '16px',
                fontSize: '2.5rem', fontWeight: '900',
                color: `${ach.color}12`, lineHeight: 1
              }}>
                {ach.stat}
              </div>

              <div style={{
                width: '56px', height: '56px',
                background: `${ach.color}15`,
                border: `1px solid ${ach.color}30`,
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', marginBottom: '16px'
              }} aria-hidden="true">
                {ach.icon}
              </div>

              <div style={{
                fontSize: '1.4rem', fontWeight: '800',
                color: ach.color, marginBottom: '8px'
              }}>
                {ach.stat}
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '10px' }}>
                {ach.title}
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.7 }}>
                {ach.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .achieve-stats-bar { grid-template-columns: repeat(2, 1fr) !important; }
          .achieve-stats-bar > div:nth-child(2) { border-right: none !important; }
          .achieve-stats-bar > div:nth-child(3) { border-right: 1px solid rgba(59,130,246,0.15) !important; border-top: 1px solid rgba(59,130,246,0.15) !important; }
          .achieve-stats-bar > div:nth-child(4) { border-top: 1px solid rgba(59,130,246,0.15) !important; }
          .achieve-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .achieve-stats-bar { grid-template-columns: repeat(2, 1fr) !important; }
          .achieve-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

