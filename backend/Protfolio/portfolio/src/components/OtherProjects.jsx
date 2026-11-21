import React, { useRef, useEffect, useState } from 'react'

const PROJECTS = [
  {
    title: 'AK ShopKart',
    desc: 'Full-featured e-commerce app with product listing, cart, Redux state management, and checkout flow.',
    icon: '🛒',
    tags: ['React', 'Redux', 'Bootstrap'],
    color: '#3B82F6',
    github: 'https://github.com/ashok/ak-shopkart',
    demo: '#'
  },
  {
    title: 'Vehicle Detection',
    desc: 'Real-time vehicle detection system using YOLOv4 and Python for traffic monitoring applications.',
    icon: '🚗',
    tags: ['YOLOv4', 'Python', 'OpenCV'],
    color: '#EF4444',
    github: 'https://github.com/ashok/vehicle-detection',
    demo: '#'
  },
  {
    title: 'Weather Dashboard',
    desc: 'Live weather app with city search, 5-day forecast, temperature charts using OpenWeather API.',
    icon: '🌤️',
    tags: ['React', 'REST API', 'Chart.js'],
    color: '#06B6D4',
    github: 'https://github.com/ashok/weather-dashboard',
    demo: '#'
  },
  {
    title: 'Portfolio Website',
    desc: 'This very portfolio — built with React, Framer Motion animations, and a premium dark design system.',
    icon: '💼',
    tags: ['React', 'CSS', 'Animations'],
    color: '#8B5CF6',
    github: 'https://github.com/ashok/portfolio',
    demo: '#'
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

export default function OtherProjects() {
  const [ref, inView] = useInView()

  return (
    <section
      id="other-projects"
      className="section"
      ref={ref}
      style={{ background: 'rgba(17,24,39,0.3)' }}
      aria-labelledby="other-projects-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            More Work
          </div>
        </div>

        <h2 id="other-projects-title" className="section-title">Other Projects</h2>
        <p className="section-subtitle">A collection of projects I've built while learning and growing</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        }} className="other-projects-grid">
          {PROJECTS.map((project, i) => (
            <article
              key={project.title}
              className="glass-card"
              style={{
                padding: '28px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease ${i * 0.12}s`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, ${project.color}, transparent)`
              }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                  width: '52px', height: '52px',
                  background: `${project.color}15`,
                  border: `1px solid ${project.color}30`,
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem'
                }} aria-hidden="true">
                  {project.icon}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.title} GitHub repository`}
                    style={{
                      width: '36px', height: '36px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', color: '#94A3B8', textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </a>
                  <a
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.title} live demo`}
                    style={{
                      width: '36px', height: '36px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', color: '#94A3B8', textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#06B6D4'; e.currentTarget.style.color = '#06B6D4' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                  </a>
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '10px' }}>
                {project.title}
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '20px' }}>
                {project.desc}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {project.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '4px 12px',
                    background: `${project.color}10`,
                    border: `1px solid ${project.color}25`,
                    borderRadius: '50px',
                    fontSize: '0.75rem', color: project.color, fontWeight: '500'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a
            href="https://github.com/ashok"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            aria-label="View all projects on GitHub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            View All on GitHub
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .other-projects-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

