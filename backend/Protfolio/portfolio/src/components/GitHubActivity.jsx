import React, { useRef, useEffect, useState } from 'react'

const STATS = [
  { label: 'Repositories', value: '15+', icon: '📁', color: '#3B82F6' },
  { label: 'Commits', value: '200+', icon: '💻', color: '#06B6D4' },
  { label: 'Followers', value: '12+', icon: '👥', color: '#8B5CF6' },
  { label: 'Top Language', value: 'Python', icon: '🐍', color: '#22C55E' },
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

export default function GitHubActivity() {
  const [ref, inView] = useInView()

  return (
    <section
      id="github"
      className="section"
      ref={ref}
      aria-labelledby="github-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            GitHub Activity
          </div>
        </div>

        <h2 id="github-title" className="section-title">GitHub Activity</h2>
        <p className="section-subtitle">My contribution graph and open source activity</p>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px', marginBottom: '48px'
        }} className="github-stats-grid">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{
                padding: '24px', textAlign: 'center',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.5s ease ${i * 0.1}s`
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }} aria-hidden="true">{stat.icon}</div>
              <div style={{
                fontSize: '1.6rem', fontWeight: '800',
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }} aria-label={`${stat.value} ${stat.label}`}>
                {stat.value}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div
          className="glass-card"
          style={{
            padding: '32px',
            opacity: inView ? 1 : 0,
            transition: 'all 0.7s ease 0.4s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>
              📊 Quick Stats
            </h3>
            <a
              href="https://github.com/ashok"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              aria-label="View GitHub profile"
            >
              View Profile
            </a>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'
          }} className="quick-stats-grid">
            {[
              { label: '⭐ Total Stars',   value: '25+' },
              { label: '🍴 Total Forks',   value: '8+'  },
              { label: '📦 Public Repos',  value: '15+' },
              { label: '🔥 Streak',        value: '45 days' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px', padding: '20px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', textAlign: 'center',
              }}>
                <span style={{ color: '#3B82F6', fontWeight: '800', fontSize: '1.4rem' }}>{item.value}</span>
                <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .github-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}

