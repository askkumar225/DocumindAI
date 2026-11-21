import React, { useRef, useEffect, useState } from 'react'

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

const CONTACT_INFO = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
    label: 'Email',
    value: 'ashok.kumar@example.com',
    href: 'mailto:ashok.kumar@example.com',
    color: '#3B82F6'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    label: 'Phone',
    value: '+91 98765 43210',
    href: 'tel:+919876543210',
    color: '#06B6D4'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    label: 'Location',
    value: 'Hyderabad, India',
    href: 'https://maps.google.com/?q=Hyderabad',
    color: '#8B5CF6'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    label: 'LinkedIn',
    value: 'linkedin.com/in/ashok-kumar',
    href: 'https://linkedin.com/in/ashok',
    color: '#0A66C2'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    label: 'GitHub',
    value: 'github.com/ashok',
    href: 'https://github.com/ashok',
    color: '#ffffff'
  },
]

export default function Contact() {
  const [ref, inView] = useInView()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.subject.trim()) errs.subject = 'Subject is required'
    if (!form.message.trim()) errs.message = 'Message is required'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSending(true)
    // Simulate sending
    await new Promise(r => setTimeout(r, 1500))
    setSending(false)
    setSent(true)
    setForm({ name: '', email: '', subject: '', message: '' })
    setTimeout(() => setSent(false), 5000)
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${errors[field] ? '#EF4444' : 'rgba(59,130,246,0.2)'}`,
    borderRadius: '12px',
    color: 'white',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    fontFamily: 'inherit',
    resize: field === 'message' ? 'vertical' : undefined
  })

  return (
    <section id="contact" className="section" ref={ref} aria-labelledby="contact-title">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            Contact
          </div>
        </div>

        <h2 id="contact-title" className="section-title">Get In Touch</h2>
        <p className="section-subtitle">Let's build something great together. I'm always open to new opportunities.</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '48px',
          alignItems: 'start'
        }} className="contact-grid">
          {/* LEFT */}
          <div style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'all 0.8s ease'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', marginBottom: '12px' }}>
              Let's Build Something Great Together
            </h3>
            <p style={{ color: '#94A3B8', lineHeight: 1.8, marginBottom: '32px' }}>
              I'm currently open to full-time roles, internships, and freelance projects. If you have an opportunity or just want to say hi, feel free to reach out!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {CONTACT_INFO.map(info => (
                <a
                  key={info.label}
                  href={info.href}
                  target={info.label !== 'Email' && info.label !== 'Phone' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={`${info.label}: ${info.value}`}
                  style={{
                    display: 'flex', gap: '16px', alignItems: 'center',
                    padding: '16px',
                    background: 'rgba(17,24,39,0.6)',
                    border: '1px solid rgba(59,130,246,0.15)',
                    borderRadius: '14px',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = info.color
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.background = `${info.color}08`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.background = 'rgba(17,24,39,0.6)'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', flexShrink: 0,
                    background: `${info.color}15`,
                    border: `1px solid ${info.color}30`,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: info.color
                  }}>
                    {info.icon}
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {info.label}
                    </div>
                    <div style={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: '500' }}>{info.value}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT – Form */}
          <div
            className="glass-card"
            style={{
              padding: '36px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(40px)',
              transition: 'all 0.8s ease 0.2s'
            }}
          >
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }} aria-hidden="true">✅</div>
                <h3 style={{ color: '#22C55E', fontWeight: '700', marginBottom: '8px' }}>Message Sent!</h3>
                <p style={{ color: '#94A3B8' }}>Thanks for reaching out. I'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
                <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '24px', fontSize: '1.1rem' }}>
                  Send a Message
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="form-row">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>
                      Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your Name"
                      required
                      aria-required="true"
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      style={inputStyle('name')}
                      onFocus={e => e.target.style.borderColor = '#3B82F6'}
                      onBlur={e => e.target.style.borderColor = errors.name ? '#EF4444' : 'rgba(59,130,246,0.2)'}
                    />
                    {errors.name && <p id="name-error" role="alert" style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>
                      Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      aria-required="true"
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      style={inputStyle('email')}
                      onFocus={e => e.target.style.borderColor = '#3B82F6'}
                      onBlur={e => e.target.style.borderColor = errors.email ? '#EF4444' : 'rgba(59,130,246,0.2)'}
                    />
                    {errors.email && <p id="email-error" role="alert" style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.email}</p>}
                  </div>
                </div>

                {/* Subject */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="subject" style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>
                    Subject *
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="What's this about?"
                    required
                    aria-required="true"
                    aria-describedby={errors.subject ? 'subject-error' : undefined}
                    style={inputStyle('subject')}
                    onFocus={e => e.target.style.borderColor = '#3B82F6'}
                    onBlur={e => e.target.style.borderColor = errors.subject ? '#EF4444' : 'rgba(59,130,246,0.2)'}
                  />
                  {errors.subject && <p id="subject-error" role="alert" style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.subject}</p>}
                </div>

                {/* Message */}
                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="message" style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '500' }}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Write your message here..."
                    required
                    aria-required="true"
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    style={{ ...inputStyle('message'), resize: 'vertical', minHeight: '120px' }}
                    onFocus={e => e.target.style.borderColor = '#3B82F6'}
                    onBlur={e => e.target.style.borderColor = errors.message ? '#EF4444' : 'rgba(59,130,246,0.2)'}
                  />
                  {errors.message && <p id="message-error" role="alert" style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px' }}>{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={sending}
                  style={{ width: '100%', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}
                  aria-label={sending ? 'Sending message...' : 'Send message'}
                >
                  {sending ? (
                    <>
                      <span style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin-slow 0.8s linear infinite'
                      }} aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 560px) {
          .form-row { grid-template-columns: 1fr !important; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}

