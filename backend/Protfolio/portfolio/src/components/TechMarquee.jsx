import React from 'react'

const TECHS = [
  { name: 'React', color: '#61DAFB', icon: '⚛️' },
  { name: 'JavaScript', color: '#F7DF1E', icon: '🟨' },
  { name: 'Python', color: '#3776AB', icon: '🐍' },
  { name: 'Django', color: '#092E20', icon: '🎸' },
  { name: 'HTML5', color: '#E34F26', icon: '🌐' },
  { name: 'CSS3', color: '#1572B6', icon: '🎨' },
  { name: 'Tailwind', color: '#06B6D4', icon: '💨' },
  { name: 'Bootstrap', color: '#7952B3', icon: '🅱️' },
  { name: 'Git', color: '#F05032', icon: '📦' },
  { name: 'GitHub', color: '#ffffff', icon: '🐙' },
  { name: 'MySQL', color: '#4479A1', icon: '🗄️' },
  { name: 'REST API', color: '#3B82F6', icon: '🔌' },
]

function MarqueeItem({ tech }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 20px',
        background: 'rgba(17,24,39,0.8)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '50px',
        margin: '0 8px',
        whiteSpace: 'nowrap',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = tech.color
        e.currentTarget.style.boxShadow = `0 0 15px ${tech.color}40`
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <span style={{ fontSize: '1.2rem' }} aria-hidden="true">{tech.icon}</span>
      <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '600' }}>{tech.name}</span>
    </div>
  )
}

export default function TechMarquee() {
  const doubled = [...TECHS, ...TECHS]

  return (
    <section
      aria-label="Tech stack"
      style={{
        padding: '48px 0',
        overflow: 'hidden',
        background: 'rgba(17,24,39,0.4)',
        borderTop: '1px solid rgba(59,130,246,0.1)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        position: 'relative',
      }}
    >
      {/* Fade masks */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px',
        background: 'linear-gradient(to right, #0B1120, transparent)',
        zIndex: 2, pointerEvents: 'none'
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px',
        background: 'linear-gradient(to left, #0B1120, transparent)',
        zIndex: 2, pointerEvents: 'none'
      }} />

      <p style={{
        textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem',
        letterSpacing: '3px', textTransform: 'uppercase',
        marginBottom: '20px', fontWeight: '600'
      }}>
        Technologies I Work With
      </p>

      {/* Row 1 – left to right */}
      <div style={{ overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          width: 'max-content',
          animation: 'marquee-left 30s linear infinite',
        }}>
          {doubled.map((tech, i) => (
            <MarqueeItem key={`a-${i}`} tech={tech} />
          ))}
        </div>
      </div>

      {/* Row 2 – right to left */}
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          width: 'max-content',
          animation: 'marquee-right 30s linear infinite',
        }}>
          {[...doubled].reverse().map((tech, i) => (
            <MarqueeItem key={`b-${i}`} tech={tech} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  )
}
