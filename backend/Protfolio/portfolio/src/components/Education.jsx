import React, { useRef, useEffect, useState } from 'react'

const EDUCATION = [
  {
    degree: 'B.Tech – Computer Science Engineering',
    institution: 'University / College',
    period: '2023 – 2026',
    grade: 'CGPA: 7.83',
    icon: '🎓',
    color: '#3B82F6',
    desc: 'Focused on data structures, algorithms, web development, and software engineering. Active in coding clubs and hackathons.',
    courses: ['Data Structures', 'Web Development', 'Database Systems', 'Software Engineering', 'Operating Systems'],
    status: 'Current'
  },
  {
    degree: 'Diploma – Electrical & Electronics Engineering',
    institution: 'Government Polytechnic',
    period: '2020 – 2023',
    grade: 'First Class',
    icon: '⚡',
    color: '#06B6D4',
    desc: 'Studied electrical fundamentals, circuit design, and electronics. This foundation helped me understand systems thinking.',
    courses: ['Circuit Theory', 'Electronics', 'Electrical Machines', 'Control Systems'],
    status: 'Completed'
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

export default function Education() {
  const [ref, inView] = useInView()

  return (
    <section
      id="education"
      className="section"
      ref={ref}
      style={{ background: 'rgba(17,24,39,0.3)' }}
      aria-labelledby="education-title"
    >
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            Education
          </div>
        </div>

        <h2 id="education-title" className="section-title">Education</h2>
        <p className="section-subtitle">My academic journey and qualifications</p>

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          {/* Timeline line */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: '28px', top: '60px', bottom: '60px',
            width: '2px', background: 'linear-gradient(to bottom, #3B82F6, #06B6D4)',
            opacity: inView ? 1 : 0, transition: 'opacity 1s ease'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {EDUCATION.map((edu, i) => (
              <div
                key={edu.degree}
                style={{
                  display: 'flex', gap: '24px', alignItems: 'flex-start',
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s ease ${i * 0.2}s`
                }}
              >
                {/* Icon node */}
                <div style={{
                  width: '56px', height: '56px', flexShrink: 0,
                  background: `${edu.color}15`,
                  border: `2px solid ${edu.color}`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', zIndex: 1,
                  boxShadow: `0 0 20px ${edu.color}30`,
                  position: 'relative'
                }} aria-hidden="true">
                  {edu.icon}
                </div>

                {/* Card */}
                <div className="glass-card" style={{ flex: 1, padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px',
                        background: edu.status === 'Current' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                        border: `1px solid ${edu.status === 'Current' ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)'}`,
                        borderRadius: '50px', fontSize: '0.7rem',
                        color: edu.status === 'Current' ? '#22C55E' : '#3B82F6',
                        fontWeight: '600', marginBottom: '8px'
                      }}>
                        {edu.status}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
                        {edu.degree}
                      </h3>
                      <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>{edu.institution}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        padding: '4px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '4px'
                      }}>
                        {edu.period}
                      </div>
                      <div style={{
                        fontSize: '0.85rem', fontWeight: '700',
                        color: edu.color
                      }}>
                        {edu.grade}
                      </div>
                    </div>
                  </div>

                  <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
                    {edu.desc}
                  </p>

                  {/* Courses */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {edu.courses.map(course => (
                      <span key={course} style={{
                        padding: '3px 10px',
                        background: `${edu.color}10`,
                        border: `1px solid ${edu.color}20`,
                        borderRadius: '50px',
                        fontSize: '0.72rem', color: edu.color, fontWeight: '500'
                      }}>
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

