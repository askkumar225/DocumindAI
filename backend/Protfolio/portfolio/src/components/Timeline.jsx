import React, { useRef, useEffect, useState } from 'react'

const JOURNEY = [
  {
    year: '2023',
    title: 'Started Programming',
    desc: 'Began my coding journey, fell in love with problem solving and building things from scratch.',
    icon: '🚀',
    color: '#3B82F6',
  },
  {
    year: '2023',
    title: 'HTML & CSS',
    desc: 'Built my first websites, learned semantic HTML and responsive CSS layouts from scratch.',
    icon: '🌐',
    color: '#F97316',
  },
  {
    year: '2023',
    title: 'JavaScript',
    desc: 'Dove into JavaScript — DOM manipulation, ES6+, async/await, and event-driven programming.',
    icon: '⚡',
    color: '#F7DF1E',
  },
  {
    year: '2024',
    title: 'React Framework',
    desc: 'Learned React — components, hooks, state management, and built multiple frontend projects.',
    icon: '⚛️',
    color: '#61DAFB',
  },
  {
    year: '2024',
    title: 'Python',
    desc: 'Mastered Python fundamentals and started building CLI tools and backend scripts.',
    icon: '🐍',
    color: '#3776AB',
  },
  {
    year: '2025',
    title: 'Django Full Stack',
    desc: 'Built full-stack apps with Django REST Framework, authentication, and database management.',
    icon: '🎸',
    color: '#06B6D4',
  },
  {
    year: '2025',
    title: 'Building Full Stack Projects',
    desc: 'Created Lakshadweep Tourism (flagship) and multiple other real-world applications.',
    icon: '💼',
    color: '#8B5CF6',
  },
  {
    year: '2026',
    title: 'Looking for Opportunities',
    desc: 'Seeking full-time roles as a Frontend / Full Stack Developer. Open to work!',
    icon: '🎯',
    color: '#22C55E',
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

function TimelineItem({ item, index, inView, isMobile }) {
  const isLeft = index % 2 === 0

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        paddingBottom: '32px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.6s ease ${index * 0.08}s`,
      }}>
        {/* Dot */}
        <div style={{
          width: '44px', height: '44px', flexShrink: 0,
          background: `${item.color}15`,
          border: `2px solid ${item.color}`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', zIndex: 1,
          boxShadow: `0 0 16px ${item.color}30`,
        }} aria-hidden="true">
          {item.icon}
        </div>
        {/* Card */}
        <div className="glass-card" style={{ flex: 1, padding: '20px' }}>
          <span style={{
            display: 'inline-block', padding: '2px 10px',
            background: `${item.color}20`, border: `1px solid ${item.color}40`,
            borderRadius: '50px', fontSize: '0.7rem', color: item.color,
            fontWeight: '700', marginBottom: '8px',
          }}>{item.year}</span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '6px' }}>
            {item.title}
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.82rem', lineHeight: 1.6 }}>{item.desc}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 60px 1fr',
      gap: '0',
      paddingBottom: '40px',
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(30px)',
      transition: `all 0.6s ease ${index * 0.08}s`,
    }}>
      {/* Left slot */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '30px' }}>
        {isLeft && (
          <div className="glass-card" style={{ maxWidth: '320px', padding: '20px 24px', width: '100%' }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px',
              background: `${item.color}20`, border: `1px solid ${item.color}40`,
              borderRadius: '50px', fontSize: '0.7rem', color: item.color,
              fontWeight: '700', marginBottom: '8px',
            }}>{item.year}</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
              {item.title}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        )}
      </div>

      {/* Center dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '44px', height: '44px',
          background: `${item.color}15`,
          border: `2px solid ${item.color}`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', zIndex: 1,
          boxShadow: `0 0 20px ${item.color}40`,
          backdropFilter: 'blur(10px)',
          flexShrink: 0,
        }} aria-hidden="true">
          {item.icon}
        </div>
      </div>

      {/* Right slot */}
      <div style={{ paddingLeft: '30px' }}>
        {!isLeft && (
          <div className="glass-card" style={{ maxWidth: '320px', padding: '20px 24px' }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px',
              background: `${item.color}20`, border: `1px solid ${item.color}40`,
              borderRadius: '50px', fontSize: '0.7rem', color: item.color,
              fontWeight: '700', marginBottom: '8px',
            }}>{item.year}</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
              {item.title}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Timeline() {
  const [ref, inView] = useInView()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <section
      id="timeline"
      className="section"
      ref={ref}
      style={{ background: 'rgba(17,24,39,0.3)' }}
      aria-labelledby="timeline-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            My Journey
          </div>
        </div>

        <h2 id="timeline-title" className="section-title">Journey Timeline</h2>
        <p className="section-subtitle">How I grew from zero to full-stack developer</p>

        <div style={{ position: 'relative', maxWidth: '860px', margin: '0 auto' }}>
          {/* Vertical center line – desktop only */}
          {!isMobile && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, #3B82F6, #06B6D4)',
                transform: 'translateX(-50%)',
                opacity: inView ? 1 : 0,
                transition: 'opacity 1s ease',
              }}
            />
          )}

          {/* Mobile: left line */}
          {isMobile && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '22px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, #3B82F6, #06B6D4)',
                opacity: inView ? 1 : 0,
                transition: 'opacity 1s ease',
              }}
            />
          )}

          {JOURNEY.map((item, i) => (
            <TimelineItem
              key={i}
              item={item}
              index={i}
              inView={inView}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

