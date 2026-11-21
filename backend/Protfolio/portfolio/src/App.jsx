import React, { useState, useEffect, useRef } from 'react'
import LoadingScreen from './components/LoadingScreen'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import TechMarquee from './components/TechMarquee'
import About from './components/About'
import WhyHireMe from './components/WhyHireMe'
import Skills from './components/Skills'
import Timeline from './components/Timeline'
import FeaturedProject from './components/FeaturedProject'
import OtherProjects from './components/OtherProjects'
import GitHubActivity from './components/GitHubActivity'
import Education from './components/Education'
import Certifications from './components/Certifications'
import Achievements from './components/Achievements'
import Contact from './components/Contact'
import Footer from './components/Footer'
import ScrollProgress from './components/ScrollProgress'
import MouseSpotlight from './components/MouseSpotlight'

// ── Scroll to Top Button ──────────────────────────────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      id="scroll-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}

// ── Magnetic Buttons (global effect) ─────────────────────────────────
function useMagneticButtons() {
  useEffect(() => {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary')
    const handlers = []

    buttons.forEach(btn => {
      const onMove = (e) => {
        const rect = btn.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (e.clientX - cx) * 0.25
        const dy = (e.clientY - cy) * 0.25
        btn.style.transform = `translate(${dx}px, ${dy}px)`
      }
      const onLeave = () => {
        btn.style.transform = 'translate(0, 0)'
      }
      btn.addEventListener('mousemove', onMove)
      btn.addEventListener('mouseleave', onLeave)
      handlers.push({ btn, onMove, onLeave })
    })

    return () => {
      handlers.forEach(({ btn, onMove, onLeave }) => {
        btn.removeEventListener('mousemove', onMove)
        btn.removeEventListener('mouseleave', onLeave)
      })
    }
  })
}

// ── Main App ──────────────────────────────────────────────────────────
function PortfolioContent() {
  useMagneticButtons()

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <MouseSpotlight />
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <Hero />
        <TechMarquee />
        <About />
        <WhyHireMe />
        <Skills />
        <Timeline />
        <FeaturedProject />
        <OtherProjects />
        <GitHubActivity />
        <Education />
        <Certifications />
        <Achievements />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <LoadingScreen />
  return <PortfolioContent />
}
