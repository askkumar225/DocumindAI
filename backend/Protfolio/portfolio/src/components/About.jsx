import React, { useRef, useEffect, useState } from 'react'
import profileImg from '../assets/Base_image.png'

// ── useInView ─────────────────────────────────────────────────────────
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

// ── Quick Info Cards ──────────────────────────────────────────────────
const INFO_CARDS = [
  { icon: '🎓', label: 'Education',    value: 'B.Tech CSE',                  color: '#3B82F6' },
  { icon: '📍', label: 'Location',     value: 'Hyderabad, Telangana',         color: '#06B6D4' },
  { icon: '💼', label: 'Role',         value: 'Python Full Stack Developer',  color: '#3B82F6' },
  { icon: '💻', label: 'Experience',   value: 'Fresher',                      color: '#10B981' },
  { icon: '🌐', label: 'Languages',    value: 'English & Telugu',             color: '#F59E0B' },
  { icon: '📅', label: 'Availability', value: 'Open to Work',                 color: '#22C55E' },
]

// ── Education Timeline ────────────────────────────────────────────────
const EDU_ITEMS = [
  {
    degree: 'B.Tech – Computer Science & Engineering',
    institution: "St. Mary's Integrated Campus",
    period: '2023 – 2026',
    icon: '🎓',
    color: '#3B82F6',
    status: 'Pursuing',
  },
  {
    degree: 'Diploma – Electrical & Electronics Engineering',
    institution: 'Government Polytechnic Kosgi',
    period: '2020 – 2023',
    icon: '⚡',
    color: '#06B6D4',
    status: 'Completed',
  },
]

// ── What I Love ───────────────────────────────────────────────────────
const LOVES = [
  'Building Full Stack Web Applications',
  'Developing Responsive User Interfaces',
  'Creating REST APIs using Django',
  'Learning Modern Web Technologies',
  'Solving Programming Problems',
  'Writing Clean & Maintainable Code',
]

// ── Profile Photo (Left) ──────────────────────────────────────────────
function ProfilePhoto({ inView }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(-60px)',
        transition: 'all 0.8s ease',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>

        {/* Animated corner glow blobs */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-30px', left: '-30px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
          filter: 'blur(20px)', animation: 'blob 6s infinite',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '-30px', right: '-30px',
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
          filter: 'blur(20px)', animation: 'blob 7s infinite 1.5s',
          pointerEvents: 'none',
        }} />

        {/* Spinning gradient border */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: '-3px',
          borderRadius: '24px',
          background: 'conic-gradient(from 0deg, #3B82F6, #06B6D4, #3B82F6, #3B82F6)',
          animation: 'spin-slow 5s linear infinite',
          zIndex: 0,
        }} />

        {/* Inner mask to show gradient ring only at border */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: '3px',
          borderRadius: '22px',
          background: '#0B1120',
          zIndex: 1,
        }} />

        {/* Photo card */}
        <div style={{
          position: 'relative', zIndex: 2,
          borderRadius: '22px',
          overflow: 'hidden',
          animation: 'float 5s ease-in-out infinite',
          boxShadow: '0 0 50px rgba(59,130,246,0.35), 0 30px 60px rgba(0,0,0,0.5)',
          background: 'linear-gradient(160deg, #1a2744 0%, #0B1120 100%)',
          margin: '3px',
        }}>
          <img
            src={profileImg}
            alt="Ashok Kumar – Python Full Stack Developer"
            style={{
              width: '100%',
              display: 'block',
              objectFit: 'cover',
              objectPosition: 'top center',
              minHeight: '420px',
              maxHeight: '520px',
            }}
            onError={e => { e.target.style.display = 'none' }}
          />

          {/* Bottom gradient overlay */}
          <div aria-hidden="true" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '120px',
            background: 'linear-gradient(to top, rgba(11,17,32,0.95) 0%, transparent 100%)',
          }} />

          {/* Name tag inside photo */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px', right: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: 'white', fontWeight: '800', fontSize: '1rem', margin: 0, lineHeight: 1.2 }}>
                Ashok Kumar
              </p>
              <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: 0, marginTop: '2px' }}>
                Python Full Stack Developer
              </p>
            </div>
            {/* Open to Work badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px',
              background: 'rgba(17,24,39,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(34,197,94,0.5)',
              borderRadius: '50px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#22C55E', boxShadow: '0 0 8px #22C55E',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
                display: 'inline-block', flexShrink: 0,
              }} aria-hidden="true" />
              <span style={{ color: '#22C55E', fontSize: '0.68rem', fontWeight: '700' }}>
                Open to Work
              </span>
            </div>
          </div>
        </div>

        {/* Side decorative dots */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '20px', right: '-20px',
          display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 3,
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: i % 2 === 0 ? '#3B82F6' : '#06B6D4',
              opacity: 0.6,
            }} />
          ))}
        </div>
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '60px', left: '-20px',
          display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 3,
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: i % 2 === 0 ? '#3B82F6' : '#06B6D4',
              opacity: 0.5,
            }} />
          ))}
        </div>

      </div>
    </div>
  )
}

// ── About Content (Right) ─────────────────────────────────────────────
function AboutContent({ inView }) {
  return (
    <div style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateX(0)' : 'translateX(60px)',
      transition: 'all 0.8s ease 0.15s',
    }}>

      {/* Section badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px',
        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: '50px', fontSize: '0.78rem', color: '#3B82F6',
        fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        👨‍💻 About Me
      </div>

      {/* Name heading */}
      <h2 id="about-title" style={{
        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
        fontWeight: '900', color: 'white',
        marginBottom: '20px', lineHeight: 1.2,
      }}>
        Hello! I'm{' '}
        <span style={{
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Ashok Kumar
        </span>
      </h2>

      {/* Bio paragraphs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
        <p style={{ color: '#CBD5E1', lineHeight: 1.85, fontSize: '0.97rem' }}>
          A Final-Year Computer Science Engineering student with a strong passion for{' '}
          <span style={{ color: '#3B82F6', fontWeight: '600' }}>Python Full Stack Development</span>.
          I enjoy building modern, responsive, and scalable web applications using{' '}
          <span style={{ color: '#06B6D4', fontWeight: '600' }}>Python, Django, React, JavaScript,</span> and{' '}
          <span style={{ color: '#06B6D4', fontWeight: '600' }}>MySQL</span>. I love solving
          real-world problems through clean code and continuously learning new technologies.
        </p>
        <p style={{ color: '#94A3B8', lineHeight: 1.85, fontSize: '0.97rem' }}>
          Currently focused on improving my backend development skills with{' '}
          <span style={{ color: '#3B82F6', fontWeight: '600' }}>Django REST Framework</span>{' '}
          while creating full-stack projects that enhance my practical experience.
        </p>
        <p style={{ color: '#94A3B8', lineHeight: 1.85, fontSize: '0.97rem' }}>
          My goal is to begin my career as a{' '}
          <span style={{ color: '#22C55E', fontWeight: '600' }}>Python Full Stack Developer</span>{' '}
          in a product-based company where I can contribute, learn, and grow as a software engineer.
        </p>
      </div>

      {/* Quick Info Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '32px',
      }} className="about-info-grid">
        {INFO_CARDS.map((card, i) => (
          <div
            key={card.label}
            style={{
              padding: '14px 16px',
              background: 'rgba(17,24,39,0.7)',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderRadius: '14px',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${0.3 + i * 0.07}s`,
              cursor: 'default',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = card.color + '60'
              e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}25`
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{
              width: '36px', height: '36px', flexShrink: 0,
              background: card.color + '15',
              border: `1px solid ${card.color}30`,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }} aria-hidden="true">{card.icon}</div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>
                {card.label}
              </div>
              <div style={{ color: 'white', fontSize: '0.82rem', fontWeight: '600', lineHeight: 1.3 }}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
          aria-label="Get in touch"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
          </svg>
          Get In Touch
        </button>
        <a href="/resume.pdf" download className="btn-secondary" aria-label="Download CV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Download CV
        </a>
      </div>
    </div>
  )
}

// ── Education Timeline (inline) ───────────────────────────────────────
function EducationTimeline({ inView }) {
  return (
    <div style={{
      marginTop: '56px',
      paddingTop: '48px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <h3 style={{
        textAlign: 'center', color: 'white', fontWeight: '800',
        fontSize: '1.4rem', marginBottom: '8px',
      }}>
        🎓 Education Timeline
      </h3>
      <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.88rem', marginBottom: '40px' }}>
        My academic background
      </p>

      <div style={{ position: 'relative', maxWidth: '680px', margin: '0 auto' }}>
        {/* Vertical line */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: '27px', top: '28px', bottom: '28px',
          width: '2px',
          background: 'linear-gradient(to bottom, #3B82F6, #06B6D4)',
          opacity: inView ? 1 : 0,
          transition: 'opacity 1s ease 0.4s',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {EDU_ITEMS.map((edu, i) => (
            <div
              key={edu.degree}
              style={{
                display: 'flex', gap: '20px', alignItems: 'flex-start',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(-30px)',
                transition: `all 0.6s ease ${0.5 + i * 0.15}s`,
              }}
            >
              {/* Node */}
              <div style={{
                width: '56px', height: '56px', flexShrink: 0,
                background: `${edu.color}15`,
                border: `2px solid ${edu.color}`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', zIndex: 1,
                boxShadow: `0 0 20px ${edu.color}30`,
              }} aria-hidden="true">{edu.icon}</div>

              {/* Card */}
              <div style={{
                flex: 1,
                background: 'rgba(17,24,39,0.8)',
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: '16px',
                padding: '20px 24px',
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = edu.color + '50'
                e.currentTarget.style.boxShadow = `0 8px 30px ${edu.color}20`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px',
                      background: edu.status === 'Pursuing' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                      border: `1px solid ${edu.status === 'Pursuing' ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.4)'}`,
                      borderRadius: '50px', fontSize: '0.68rem',
                      color: edu.status === 'Pursuing' ? '#22C55E' : '#3B82F6',
                      fontWeight: '700', marginBottom: '6px',
                    }}>{edu.status}</span>
                    <h4 style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>
                      {edu.degree}
                    </h4>
                  </div>
                  <span style={{
                    padding: '4px 12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#94A3B8', fontSize: '0.78rem', whiteSpace: 'nowrap',
                  }}>{edu.period}</span>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.83rem', margin: 0 }}>
                  {edu.institution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── What I Love ───────────────────────────────────────────────────────
function WhatILove({ inView }) {
  return (
    <div style={{
      marginTop: '56px',
      paddingTop: '48px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <h3 style={{
        textAlign: 'center', color: 'white', fontWeight: '800',
        fontSize: '1.4rem', marginBottom: '8px',
      }}>
        ❤️ What I Love
      </h3>
      <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.88rem', marginBottom: '36px' }}>
        Passions that drive my work
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px', maxWidth: '780px', margin: '0 auto',
      }} className="loves-grid">
        {LOVES.map((love, i) => (
          <div
            key={love}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px',
              background: 'rgba(17,24,39,0.7)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: '12px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(16px)',
              transition: `all 0.5s ease ${0.6 + i * 0.07}s`,
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
              e.currentTarget.style.background = 'rgba(59,130,246,0.07)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'
              e.currentTarget.style.background = 'rgba(17,24,39,0.7)'
            }}
          >
            <div style={{
              width: '22px', height: '22px', flexShrink: 0,
              background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ color: '#CBD5E1', fontSize: '0.87rem', fontWeight: '500' }}>{love}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Career Objective ──────────────────────────────────────────────────
function CareerObjective({ inView }) {
  return (
    <div style={{
      marginTop: '56px',
      paddingTop: '48px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: '780px', margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.05))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '20px',
        padding: '36px 40px',
        position: 'relative', overflow: 'hidden',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s ease 0.8s',
      }}>
        {/* Decorative quote mark */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '16px', left: '24px',
          fontSize: '5rem', lineHeight: 1, color: 'rgba(59,130,246,0.1)',
          fontFamily: 'Georgia, serif', fontWeight: '900',
          userSelect: 'none',
        }}>"</div>

        {/* Glow blob */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }} aria-hidden="true">🎯</div>
          <h3 style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>
            Career Objective
          </h3>
        </div>

        <p style={{
          color: '#CBD5E1', lineHeight: 1.9, fontSize: '0.97rem',
          position: 'relative', zIndex: 1, margin: 0,
        }}>
          My objective is to secure a{' '}
          <span style={{ color: '#3B82F6', fontWeight: '700' }}>Python Full Stack Developer</span> role
          where I can apply my knowledge of{' '}
          <span style={{ color: '#06B6D4', fontWeight: '600' }}>Python, Django, React, REST APIs,</span> and{' '}
          <span style={{ color: '#06B6D4', fontWeight: '600' }}>MySQL</span> to build high-quality web
          applications while continuously learning and growing as a software engineer.
        </p>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────
export default function About() {
  const [ref, inView] = useInView()

  return (
    <section
      id="about"
      className="section"
      ref={ref}
      aria-labelledby="about-title"
    >
      <div className="container">

        {/* ── Section Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.78rem', color: '#3B82F6',
            fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            About Me
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800',
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0,
          }}>
            Know Who I Am
          </h2>
        </div>

        {/* ── Split Layout: Photo | Content ── */}
        <div
          className="about-split"
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: '72px',
            alignItems: 'flex-start',
          }}
        >
          <ProfilePhoto inView={inView} />
          <AboutContent inView={inView} />
        </div>

        {/* ── Education, What I Love, Career Objective ── */}
        <EducationTimeline inView={inView} />
        <WhatILove inView={inView} />
        <CareerObjective inView={inView} />

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes blob {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, -15px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @media (max-width: 1024px) {
          .about-split { grid-template-columns: 300px 1fr !important; gap: 48px !important; }
        }
        @media (max-width: 860px) {
          .about-split {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .about-split > div:first-child {
            max-width: 340px;
            margin: 0 auto;
          }
        }
        @media (max-width: 640px) {
          .about-info-grid { grid-template-columns: 1fr 1fr !important; }
          .loves-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
