import React from 'react'

const FOOTER_LINKS = ['Home', 'About', 'Skills', 'Projects', 'Achievements', 'Contact']

export default function Footer() {
  const handleNavClick = (id) => {
    const el = document.getElementById(id.toLowerCase())
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer
      role="contentinfo"
      style={{
        background: 'rgba(5, 8, 20, 0.95)',
        borderTop: '1px solid rgba(59,130,246,0.15)',
        padding: '60px 24px 32px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr',
          gap: '48px',
          marginBottom: '48px',
          paddingBottom: '48px',
          borderBottom: '1px solid rgba(255,255,255,0.07)'
        }} className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'
            }}>
              <div style={{
                width: '44px', height: '44px',
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', color: 'white', fontSize: '1rem'
              }} aria-hidden="true">
                AK
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>Ashok Kumar</div>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Frontend Developer</div>
              </div>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.8, maxWidth: '280px' }}>
              Building responsive and scalable web applications with React, Python, and Django. Open to new opportunities.
            </p>
            {/* Tech tags */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              {['React', 'Python', 'Django'].map(t => (
                <span key={t} style={{
                  padding: '3px 10px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '50px',
                  fontSize: '0.72rem', color: '#3B82F6', fontWeight: '500'
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Quick Links
            </h3>
            <nav aria-label="Footer navigation">
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {FOOTER_LINKS.map(link => (
                  <li key={link}>
                    <button
                      onClick={() => handleNavClick(link)}
                      style={{
                        background: 'none', border: 'none',
                        color: '#64748B', fontSize: '0.9rem',
                        cursor: 'pointer', padding: 0,
                        transition: 'color 0.3s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.target.style.color = '#3B82F6'}
                      onMouseLeave={e => e.target.style.color = '#64748B'}
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '20px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Connect
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Email', value: 'ashok@example.com', href: 'mailto:ashok@example.com' },
                { label: 'Location', value: 'Hyderabad, India', href: '#' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ color: '#475569', fontSize: '0.7rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{item.label}</div>
                  <a href={item.href} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>{item.value}</a>
                </div>
              ))}
            </div>

            {/* Social Icons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                {
                  label: 'GitHub',
                  href: 'https://github.com/ashok',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  )
                },
                {
                  label: 'LinkedIn',
                  href: 'https://linkedin.com/in/ashok',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  )
                },
                {
                  label: 'Email',
                  href: 'mailto:ashok@example.com',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
                    </svg>
                  )
                },
              ].map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.label !== 'Email' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  style={{
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#64748B',
                    transition: 'all 0.3s ease', textDecoration: 'none'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#3B82F6'
                    e.currentTarget.style.color = '#3B82F6'
                    e.currentTarget.style.background = 'rgba(59,130,246,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = '#64748B'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <p style={{ color: '#475569', fontSize: '0.85rem' }}>
            © 2026 Ashok Kumar. All rights reserved.
          </p>
          <p style={{ color: '#475569', fontSize: '0.85rem' }}>
            Made with{' '}
            <span style={{ color: '#EF4444' }} aria-label="love">❤️</span>
            {' '}using{' '}
            <span style={{ color: '#61DAFB', fontWeight: '600' }}>React</span>
          </p>
          <p style={{ color: '#475569', fontSize: '0.85rem' }}>
            <span style={{ color: '#22C55E' }}>●</span>{' '}Open To Work
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </footer>
  )
}

