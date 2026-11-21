import React, { useEffect, useRef } from 'react'

export default function MouseSpotlight() {
  const spotRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (spotRef.current) {
        spotRef.current.style.left = e.clientX + 'px'
        spotRef.current.style.top = e.clientY + 'px'
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return <div className="spotlight" ref={spotRef} aria-hidden="true" />
}
