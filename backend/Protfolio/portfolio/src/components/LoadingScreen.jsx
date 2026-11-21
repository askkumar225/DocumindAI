import React, { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 150)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0B1120',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      gap: '32px'
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        top: '20%',
        left: '20%',
        animation: 'blob 7s infinite',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        bottom: '20%',
        right: '20%',
        animation: 'blob 7s infinite 2s',
        filter: 'blur(40px)'
      }} />

      {/* Logo */}
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        fontWeight: '900',
        color: 'white',
        boxShadow: '0 0 40px rgba(59,130,246,0.5)',
        animation: 'float 3s ease-in-out infinite'
      }}>
        AK
      </div>

      {/* Name */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: 'white',
          marginBottom: '4px',
          letterSpacing: '2px'
        }}>ASHOK KUMAR</h2>
        <p style={{ color: '#94A3B8', fontSize: '0.9rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Frontend Developer
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '280px' }}>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(progress, 100)}%`,
            background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
            borderRadius: '2px',
            transition: 'width 0.15s ease',
            boxShadow: '0 0 10px rgba(59,130,246,0.8)'
          }} />
        </div>
        <p style={{
          color: '#94A3B8',
          fontSize: '0.75rem',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          Loading... {Math.min(Math.round(progress), 100)}%
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
  )
}

