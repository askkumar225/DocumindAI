import React, { useState, useEffect } from 'react'

const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Achievements', href: '#achievements' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      // Active section detection
      const sections = ['hero','about','skills','projects','achievements','contact']
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el && window.scrollY >= el.offsetTop - 100) {
          setActiveSection(sections[i])
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0 24px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled ? 'rgba(15,23,42,0.70)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transition: 'all 0.3s ease',
          maxWidth: '100%',
        }}
      >
        {/* Logo */}
        <a
          href="#hero"
          onClick={e => { e.preventDefault(); handleNavClick('#hero') }}
          aria-label="Ashok Kumar - Home"
          style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '1rem',
            color: 'white',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            flexShrink: 0
          }}
        >
          AK
        </a>

        {/* Desktop Links */}
        <ul
          style={{
            display: 'flex',
            listStyle: 'none',
            gap: '8px',
            alignItems: 'center',
          }}
          className="nav-desktop"
        >
          {NAV_LINKS.map(link => (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={e => { e.preventDefault(); handleNavClick(link.href) }}
                aria-current={activeSection === link.href.slice(1) ? 'page' : undefined}
                style={{
                  padding: '8px 16px',
                  borderRadius: '50px',
                  color: activeSection === link.href.slice(1) ? 'white' : '#94A3B8',
                  background: activeSection === link.href.slice(1) ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: activeSection === link.href.slice(1) ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                  display: 'inline-block',
                  whiteSpace: 'nowrap'
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Resume Button */}
        <a
          href="/resume.pdf"
          download
          className="btn-primary nav-resume"
          style={{ padding: '10px 20px', fontSize: '0.85rem' }}
          aria-label="Download Resume"
        >
          <span>Resume</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </a>

        {/* Hamburger */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ display: 'block', width: '20px', height: '2px', background: menuOpen ? '#3B82F6' : 'white', transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: menuOpen ? '#3B82F6' : 'white', transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: menuOpen ? '#3B82F6' : 'white', transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: 0,
            right: 0,
            background: 'rgba(11,17,32,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(59,130,246,0.2)',
            zIndex: 999,
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          role="menu"
        >
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              role="menuitem"
              onClick={e => { e.preventDefault(); handleNavClick(link.href) }}
              style={{
                padding: '12px 16px',
                color: activeSection === link.href.slice(1) ? '#3B82F6' : 'white',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                borderRadius: '12px',
                background: activeSection === link.href.slice(1) ? 'rgba(59,130,246,0.1)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/resume.pdf"
            download
            className="btn-primary"
            style={{ marginTop: '8px', textAlign: 'center', justifyContent: 'center' }}
          >
            Download Resume
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-resume { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
