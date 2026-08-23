'use client'

import { useState, useEffect, useCallback } from 'react'

export function useViewport() {
  const [viewportHeight, setViewportHeight] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    console.log('🚀 useScrollPosition initialized')
    
    // Direct function that always gets the right value
    const getScroll = () => {
      // Try everything
      const pos = 
        window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollTop
      
      console.log('🎯 getScroll() returned:', pos)
      return pos
    }
    
    const handleScroll = () => {
      const pos = getScroll()
      setScrollY(pos)
    }
    
    // Initial value
    console.log('Initial scroll:', getScroll())
    setScrollY(getScroll())
    
    // Add listener
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Test it
    setTimeout(() => {
      console.log('🧪 Manual scroll test to 100px')
      window.scrollTo(0, 100)
      setTimeout(() => {
        console.log('🧪 Current after manual scroll:', getScroll())
      }, 100)
    }, 500)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return { 
    viewportHeight, 
    scrollY, 
    viewportWidth,
    isClient 
  }
}