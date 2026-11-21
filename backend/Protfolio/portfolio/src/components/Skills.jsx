import React, { useRef, useEffect, useState } from 'react'

// ── SVG Tech Icons ────────────────────────────────────────────────────
const Icons = {
  HTML5: () => (
    <svg viewBox="0 0 24 24" width="44" height="44" fill="none">
      <path d="M4.136 18.615L2.5 3h19l-1.637 15.615L12 21l-7.864-2.385z" fill="#E44D26"/>
      <path d="M12 19.779l6.355-1.76L19.748 5H12v14.779z" fill="#F16529"/>
      <path d="M12 10.289H9.15l-.196-2.193H12V5.876H6.682l.513 5.73H12v-1.317zm0 5.512l-.011.003-2.537-.685-.162-1.814H7.024l.319 3.574 4.645 1.289.012-.003v-2.364z" fill="#EBEBEB"/>
      <path d="M12 10.289v1.317h2.67l-.252 2.809-2.418.653v2.364l4.648-1.287.034-.38.533-5.973.055-.503H12zm0-4.413v2.22h5.133l.044-.49.1-1.112.052-.618H12z" fill="#fff"/>
    </svg>
  ),
  CSS3: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M4.192 18.615L2.5 3h19l-1.693 15.615L12 21l-7.808-2.385z" fill="#1572B6"/>
      <path d="M12 19.779l6.31-1.748L19.713 5H12v14.779z" fill="#33A9DC"/>
      <path d="M12 10.5H9.02l-.189-2.124H12V6.24H6.71l.505 5.657H12V10.5zm0 5.384l-.01.002-2.514-.68-.16-1.796H7.07l.315 3.536 4.604 1.277.011-.003v-2.336z" fill="#fff"/>
      <path d="M12 10.5v1.397h2.642l-.249 2.784-2.393.647v2.336l4.604-1.276.034-.376.527-5.913.055-.499H12zm0-4.26v2.136h5.08l.044-.486.1-1.1.051-.55H12z" fill="#EBEBEB"/>
    </svg>
  ),
  JavaScript: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <rect width="24" height="24" rx="3" fill="#F7DF1E"/>
      <path d="M6.235 16.825c.342.56.8.97 1.6.97.672 0 1.1-.336 1.1-.8 0-.555-.44-.752-1.18-1.074l-.405-.174c-1.17-.498-1.947-1.122-1.947-2.44 0-1.214.924-2.138 2.368-2.138.975 0 1.676.338 2.18 1.225l-1.195.766c-.263-.47-.547-.655-.985-.655-.448 0-.733.284-.733.655 0 .459.285.645 1.945 1.384 1.163.5 1.932 1.155 1.932 2.43 0 1.393-1.095 2.257-2.566 2.257-1.44 0-2.37-.685-2.824-1.584l1.71-.822zm7.05.154c.247.437.472.808 1.007.808.514 0 .84-.2.84-.978v-5.3h1.515v5.32c0 1.611-.944 2.345-2.323 2.345-1.246 0-1.969-.645-2.337-1.423l1.298-.772z"/>
    </svg>
  ),
  React: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <circle cx="12" cy="12" r="2.139" fill="#61DAFB"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.8" fill="none" stroke="#61DAFB" strokeWidth="1.2"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.8" fill="none" stroke="#61DAFB" strokeWidth="1.2" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.8" fill="none" stroke="#61DAFB" strokeWidth="1.2" transform="rotate(120 12 12)"/>
    </svg>
  ),
  Tailwind: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M12 6C9.33 6 7.67 7.33 7 10c1-1.33 2.17-1.83 3.5-1.5.76.19 1.3.74 1.9 1.35C13.4 11 14.6 12 17 12c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.9-1.35C15.6 7 14.4 6 12 6zM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.3.74 1.9 1.35C8.4 17 9.6 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.9-1.35C10.6 13 9.4 12 7 12z" fill="#06B6D4"/>
    </svg>
  ),
  Bootstrap: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <rect width="24" height="24" rx="4" fill="#7952B3"/>
      <path d="M6.375 17.25V6.75h4.898c1.03 0 1.846.248 2.449.744.604.492.906 1.164.906 2.016 0 .576-.152 1.068-.457 1.476a2.587 2.587 0 01-1.207.9v.072c.648.132 1.16.43 1.535.893.38.462.569 1.028.569 1.697 0 .948-.322 1.696-.965 2.244-.643.546-1.524.818-2.642.818H6.375zm1.8-6.012h2.926c.696 0 1.238-.165 1.626-.494.389-.33.583-.794.583-1.393 0-.576-.183-1.02-.549-1.33-.362-.313-.89-.469-1.584-.469H8.175v3.686zm0 4.562h3.15c.756 0 1.34-.18 1.75-.54.416-.36.624-.87.624-1.529 0-.636-.214-1.13-.641-1.48-.428-.35-1.028-.525-1.8-.525H8.175v4.074z" fill="#fff"/>
    </svg>
  ),
  Python: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <defs>
        <linearGradient id="pyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#387EB8"/>
          <stop offset="100%" stopColor="#366994"/>
        </linearGradient>
        <linearGradient id="pyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE052"/>
          <stop offset="100%" stopColor="#FFC331"/>
        </linearGradient>
      </defs>
      <path d="M11.914 2C7.257 2 7.527 4.035 7.527 4.035l.006 2.106h4.469v.633H5.978S3 6.427 3 11.14c0 4.713 2.607 4.547 2.607 4.547h1.556v-2.188s-.084-2.606 2.562-2.606h4.415s2.479.04 2.479-2.396V4.475S16.97 2 11.914 2zM9.358 3.578a.81.81 0 110 1.621.81.81 0 010-1.621z" fill="url(#pyGrad1)"/>
      <path d="M12.086 22c4.657 0 4.387-2.035 4.387-2.035l-.006-2.106h-4.469v-.633h6.024S21 17.573 21 12.86c0-4.713-2.607-4.547-2.607-4.547h-1.556v2.188s.084 2.606-2.562 2.606H9.86s-2.479-.04-2.479 2.396v4.022S7.03 22 12.086 22zm2.556-1.578a.81.81 0 110-1.621.81.81 0 010 1.621z" fill="url(#pyGrad2)"/>
    </svg>
  ),
  Django: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <rect width="24" height="24" rx="3" fill="#0C4B33"/>
      <path d="M11.5 4h2v9.5c-1 .19-1.74.26-2.54.26-2.38 0-3.63-1.08-3.63-3.14 0-2 1.33-3.3 3.4-3.3.32 0 .57.03.77.08V4zm0 5.15a1.9 1.9 0 00-.6-.09c-1 0-1.57.62-1.57 1.7 0 1.05.55 1.63 1.55 1.63.19 0 .38-.01.62-.05V9.15zM15.5 7.75h2v8.5c0 2.94-1.5 4.04-3.9 4.04-.76 0-1.46-.13-2.1-.38l.32-1.55c.51.2 1.03.33 1.63.33 1.26 0 2.05-.59 2.05-2.15v-.49a4.3 4.3 0 01-1.47.25c-1.96 0-3.15-1.25-3.15-3.28 0-2.14 1.3-3.4 3.35-3.4.57 0 1.14.1 1.27.13V7.75zm0 1.68a2.6 2.6 0 00-.77-.1c-.98 0-1.6.62-1.6 1.75 0 1.05.57 1.66 1.56 1.66.27 0 .57-.05.81-.14V9.43z" fill="#fff"/>
    </svg>
  ),
  MySQL: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M3.2 14.28c.21 0 .37-.02.5-.06.13-.04.24-.1.32-.19.09-.09.15-.2.19-.33.04-.13.06-.29.06-.47v-2.08c0-.16-.02-.3-.06-.43a.73.73 0 00-.19-.32.8.8 0 00-.32-.2 1.53 1.53 0 00-.5-.07H2v4.15h1.2zm-.43-3.52h.3c.12 0 .22.01.3.04.09.02.16.07.22.13.06.06.1.14.13.24.03.1.04.22.04.37v1.65c0 .14-.01.27-.04.37a.6.6 0 01-.13.24.5.5 0 01-.22.14 1.08 1.08 0 01-.3.04H2.77v-3.22zM7.33 12.3c-.09-.1-.2-.17-.34-.23a1.27 1.27 0 00-.48-.08c-.17 0-.33.03-.47.08a1.02 1.02 0 00-.35.23.97.97 0 00-.22.35 1.33 1.33 0 00-.08.47v1.08c0 .17.03.33.08.47.05.14.13.26.22.36.1.1.22.17.35.22.14.05.3.08.47.08.18 0 .34-.03.48-.08.14-.05.25-.13.34-.22a.97.97 0 00.22-.36c.05-.14.08-.3.08-.47v-1.08c0-.17-.03-.33-.08-.47a1.05 1.05 0 00-.22-.35zm-.42 1.87c0 .19-.04.33-.12.43-.08.1-.2.15-.35.15a.46.46 0 01-.36-.15c-.08-.1-.12-.24-.12-.43v-1.01c0-.2.04-.34.12-.44.08-.1.2-.15.36-.15.15 0 .27.05.35.15.08.1.12.25.12.44v1.01zM9.75 12h-.65v2.28h.65V12zm-.33-.88a.4.4 0 00.3-.11.38.38 0 00.11-.28.39.39 0 00-.11-.29.4.4 0 00-.3-.11.4.4 0 00-.3.11.4.4 0 00-.11.29c0 .11.04.2.11.28.07.07.18.11.3.11zM12.26 12H11.6l-.7 1.15-.67-1.15h-.7l1.05 1.68-1.1 1.6h.7l.72-1.2.7 1.2h.71l-1.1-1.6 1.05-1.68z" fill="#4479A1"/>
      <path d="M20.7 8.13c-.14-.01-.29 0-.44.03-.06.01-.1.05-.1.1l-.01.07c.02.13.12.26.2.36l.15.2c.1.13.2.26.3.4.05.07.1.14.14.21l.01.03c.04-.02.09-.04.13-.07.2-.13.38-.3.51-.5a.5.5 0 00.06-.43.72.72 0 00-.47-.38c-.16-.04-.32-.04-.48-.02z" fill="#00758F"/>
      <path d="M21.14 6.7c-.08 0-.16 0-.24.02a.35.35 0 00-.2.14.47.47 0 00-.04.35c.03.1.1.2.18.27.1.08.22.13.35.14.12 0 .25-.01.36-.07.1-.05.18-.14.22-.25a.46.46 0 00-.04-.37.58.58 0 00-.31-.2 1.13 1.13 0 00-.28-.03z" fill="#00758F"/>
    </svg>
  ),
  Git: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M21.64 11.21L12.79 2.36a1.22 1.22 0 00-1.73 0L9.2 4.22l2.19 2.19a1.45 1.45 0 011.84 1.85l2.11 2.1a1.45 1.45 0 011.59 2.38 1.45 1.45 0 01-2.12-1.56l-1.97-1.97v5.18a1.45 1.45 0 11-1.19-.03V8.95a1.45 1.45 0 01-.78-1.9L8.7 4.88 2.36 11.22a1.22 1.22 0 000 1.73l8.85 8.84a1.22 1.22 0 001.73 0l8.7-8.7a1.22 1.22 0 000-1.88z" fill="#F05032"/>
    </svg>
  ),
  GitHub: () => (
    <svg viewBox="0 0 24 24" width="44" height="44" fill="white">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  ),
  Vercel: () => (
    <svg viewBox="0 0 24 24" width="44" height="44" fill="white">
      <path d="M12 2L2 19.5h20L12 2z"/>
    </svg>
  ),
  Postman: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <circle cx="12" cy="12" r="10" fill="#FF6C37"/>
      <path d="M15.3 8.7a4.5 4.5 0 11-6.4 6.4L15.3 8.7zm-1.1 1.1L8.9 15.1a3 3 0 004.2-4.2l1.1-1.1z" fill="white"/>
      <circle cx="13.5" cy="10.5" r="1" fill="white"/>
    </svg>
  ),
  RESTAPI: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <rect width="24" height="24" rx="4" fill="#3B82F6"/>
      <text x="4" y="16" fontFamily="monospace" fontSize="8" fill="white" fontWeight="bold">REST</text>
      <text x="5" y="22" fontFamily="monospace" fontSize="6" fill="#93C5FD">API</text>
    </svg>
  ),
  SQLite: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M3 6c0-1.7 4-3 9-3s9 1.3 9 3v3c0 1.7-4 3-9 3S3 10.7 3 9V6z" fill="#0F80CC"/>
      <path d="M3 9v3c0 1.7 4 3 9 3s9-1.3 9-3V9c0 1.7-4 3-9 3S3 10.7 3 9z" fill="#0F80CC" opacity=".7"/>
      <path d="M3 12v3c0 1.7 4 3 9 3s9-1.3 9-3v-3c0 1.7-4 3-9 3S3 13.7 3 12z" fill="#0F80CC" opacity=".5"/>
      <path d="M3 15v3c0 1.7 4 3 9 3s9-1.3 9-3v-3c0 1.7-4 3-9 3S3 16.7 3 15z" fill="#0F80CC" opacity=".3"/>
    </svg>
  ),
  VSCode: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M17.5 3.2L9.4 11 4.7 7.4 3 8.5v7l1.7 1.1 4.7-3.6 8.1 7.8 2.5-1.2V4.4L17.5 3.2zm0 14.2l-6-5.4 6-5.4v10.8z" fill="#007ACC"/>
    </svg>
  ),
  Render: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <rect width="24" height="24" rx="4" fill="#46E3B7"/>
      <text x="4" y="16" fontFamily="sans-serif" fontSize="10" fill="#0D1117" fontWeight="900">R</text>
    </svg>
  ),
  Cloudflare: () => (
    <svg viewBox="0 0 24 24" width="44" height="44">
      <path d="M15.4 16.1l.3-1a3.4 3.4 0 00-3.3-4.3 3.4 3.4 0 00-3.2 2.3l-.1.5-.5-.1A2.2 2.2 0 006 15.7a2.2 2.2 0 002.2 2.1h6.8a1.8 1.8 0 001.8-1.8 1.8 1.8 0 00-1.4-1.9z" fill="#F38020"/>
      <path d="M18.1 13.7l-.2-.5a2.3 2.3 0 00-2.2-1.6 2.3 2.3 0 00-1.4.5 2.3 2.3 0 001.4 4.1h2a1.3 1.3 0 001.3-1.3 1.3 1.3 0 00-.9-1.2z" fill="#FBAD41"/>
    </svg>
  ),
}

// ── Skill Data ────────────────────────────────────────────────────────
const ALL_SKILLS = [
  { name: 'HTML5',       icon: 'HTML5',      level: 'ADVANCED',      category: 'Frontend',          bg: '#E44D26',    glow: 'rgba(228,77,38,0.35)' },
  { name: 'CSS3',        icon: 'CSS3',       level: 'ADVANCED',      category: 'Frontend',          bg: '#1572B6',    glow: 'rgba(21,114,182,0.35)' },
  { name: 'JavaScript',  icon: 'JavaScript', level: 'ADVANCED',      category: 'Frontend',          bg: '#F7DF1E',    glow: 'rgba(247,223,30,0.35)' },
  { name: 'React.js',    icon: 'React',      level: 'ADVANCED',      category: 'Frontend',          bg: '#20232A',    glow: 'rgba(97,218,251,0.35)' },
  { name: 'Tailwind CSS',icon: 'Tailwind',   level: 'INTERMEDIATE',  category: 'Frontend',          bg: '#0F172A',    glow: 'rgba(6,182,212,0.35)' },
  { name: 'Bootstrap',   icon: 'Bootstrap',  level: 'ADVANCED',      category: 'Frontend',          bg: '#7952B3',    glow: 'rgba(121,82,179,0.35)' },
  { name: 'Python',      icon: 'Python',     level: 'ADVANCED',      category: 'Backend',           bg: '#1e3a5f',    glow: 'rgba(55,118,171,0.35)' },
  { name: 'Django',      icon: 'Django',     level: 'INTERMEDIATE',  category: 'Backend',           bg: '#0C4B33',    glow: 'rgba(12,75,51,0.45)' },
  { name: 'REST API',    icon: 'RESTAPI',    level: 'INTERMEDIATE',  category: 'Backend',           bg: '#1E3A8A',    glow: 'rgba(59,130,246,0.35)' },
  { name: 'MySQL',       icon: 'MySQL',      level: 'INTERMEDIATE',  category: 'Database',          bg: '#00758F',    glow: 'rgba(0,117,143,0.35)' },
  { name: 'SQLite',      icon: 'SQLite',     level: 'INTERMEDIATE',  category: 'Database',          bg: '#003B57',    glow: 'rgba(15,128,204,0.35)' },
  { name: 'Git',         icon: 'Git',        level: 'ADVANCED',      category: 'Tools & Platforms', bg: '#1a1a1a',    glow: 'rgba(240,80,50,0.35)' },
  { name: 'GitHub',      icon: 'GitHub',     level: 'ADVANCED',      category: 'Tools & Platforms', bg: '#161B22',    glow: 'rgba(255,255,255,0.15)' },
  { name: 'VS Code',     icon: 'VSCode',     level: 'ADVANCED',      category: 'Tools & Platforms', bg: '#1E1E1E',    glow: 'rgba(0,122,204,0.35)' },
  { name: 'Postman',     icon: 'Postman',    level: 'INTERMEDIATE',  category: 'Tools & Platforms', bg: '#1a1a1a',    glow: 'rgba(255,108,55,0.35)' },
  { name: 'Vercel',      icon: 'Vercel',     level: 'INTERMEDIATE',  category: 'Tools & Platforms', bg: '#000000',    glow: 'rgba(255,255,255,0.15)' },
  { name: 'Render',      icon: 'Render',     level: 'LEARNING',      category: 'Tools & Platforms', bg: '#0D1117',    glow: 'rgba(70,227,183,0.35)' },
  { name: 'Cloudflare',  icon: 'Cloudflare', level: 'LEARNING',      category: 'Tools & Platforms', bg: '#1a1a2e',    glow: 'rgba(243,128,32,0.35)' },
]

const CATEGORIES = ['All', 'Frontend', 'Backend', 'Database', 'Tools & Platforms']

const LEVEL_META = {
  ADVANCED:     { color: '#22C55E', label: 'ADVANCED' },
  INTERMEDIATE: { color: '#38BDF8', label: 'INTERMEDIATE' },
  LEARNING:     { color: '#FACC15', label: 'LEARNING' },
}

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

// ── Single Skill Card ─────────────────────────────────────────────────
function SkillCard({ skill, index, inView }) {
  const cardRef = useRef(null)
  const IconComponent = Icons[skill.icon]
  const levelMeta = LEVEL_META[skill.level]

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotX = ((y - cy) / cy) * -12
    const rotY = ((x - cx) / cx) * 12
    card.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) scale(1.04)`
    card.style.boxShadow = `0 20px 40px ${skill.glow}, 0 0 0 1px rgba(255,255,255,0.08)`
  }

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0) scale(1)'
      cardRef.current.style.boxShadow = ''
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'rgba(17,24,39,0.85)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '28px 20px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        cursor: 'default',
        opacity: inView ? 1 : 0,
        transform: inView
          ? 'perspective(600px) rotateX(0) rotateY(0) translateY(0) scale(1)'
          : 'translateY(30px)',
        transition: `opacity 0.5s ease ${index * 0.05}s, transform 0.5s ease ${index * 0.05}s, box-shadow 0.2s ease`,
        transformStyle: 'preserve-3d',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Subtle top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
        background: `linear-gradient(90deg, transparent, ${levelMeta.color}60, transparent)`,
      }} aria-hidden="true" />

      {/* Icon with colored background circle */}
      <div style={{
        width: '72px', height: '72px',
        background: skill.bg,
        borderRadius: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 24px ${skill.glow}`,
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.08)',
      }} aria-hidden="true">
        {IconComponent ? <IconComponent /> : (
          <span style={{ fontSize: '1.8rem' }}>⚙️</span>
        )}
      </div>

      {/* Skill Name */}
      <p style={{
        color: 'white',
        fontWeight: '700',
        fontSize: '0.95rem',
        textAlign: 'center',
        lineHeight: 1.3,
        margin: 0,
      }}>
        {skill.name}
      </p>

      {/* Level badge */}
      <p style={{
        color: levelMeta.color,
        fontSize: '0.65rem',
        fontWeight: '800',
        letterSpacing: '1.5px',
        margin: 0,
      }}>
        {levelMeta.label}
      </p>

      {/* Category chip */}
      <div style={{
        padding: '3px 12px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '50px',
        fontSize: '0.7rem',
        color: '#94A3B8',
        fontWeight: '500',
      }}>
        {skill.category.replace(' & Platforms', '')}
      </div>
    </div>
  )
}

// ── Skills Section ────────────────────────────────────────────────────
export default function Skills() {
  const [ref, inView] = useInView()
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? ALL_SKILLS
    : ALL_SKILLS.filter(s => s.category === activeFilter)

  return (
    <section id="skills" className="section" ref={ref} aria-labelledby="skills-title">
      <div className="container">

        {/* Badge + Title */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '50px', fontSize: '0.8rem', color: '#3B82F6',
            fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            My Skills
          </div>
        </div>
        <h2 id="skills-title" className="section-title">Technical Skills</h2>
        <p className="section-subtitle">Technologies I work with to build modern, performant web experiences.</p>

        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter skills by category"
          style={{
            display: 'flex', gap: '10px', justifyContent: 'center',
            flexWrap: 'wrap', marginBottom: '48px',
          }}
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeFilter === cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                padding: '9px 20px',
                background: activeFilter === cat
                  ? 'linear-gradient(135deg, #3B82F6, #06B6D4)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeFilter === cat ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '50px',
                color: activeFilter === cat ? 'white' : '#94A3B8',
                fontSize: '0.88rem',
                fontWeight: activeFilter === cat ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: activeFilter === cat ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '16px',
          }}
          className="skills-cards-grid"
        >
          {filtered.map((skill, i) => (
            <SkillCard key={skill.name} skill={skill} index={i} inView={inView} />
          ))}
        </div>

        {/* Legend */}
        <div
          aria-label="Skill level legend"
          style={{
            display: 'flex', gap: '28px', justifyContent: 'center',
            marginTop: '48px', flexWrap: 'wrap',
          }}
        >
          {Object.entries(LEVEL_META).map(([key, { color, label }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: color, boxShadow: `0 0 6px ${color}`,
              }} aria-hidden="true" />
              <span style={{ color: '#94A3B8', fontSize: '0.82rem', fontWeight: '500' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .skills-cards-grid { grid-template-columns: repeat(5, 1fr) !important; }
        }
        @media (max-width: 1000px) {
          .skills-cards-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .skills-cards-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .skills-cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}

