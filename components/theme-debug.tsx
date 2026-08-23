// components/theme-debug.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeDebug() {
  const { theme, systemTheme, themes, resolvedTheme, setTheme } = useTheme()
  const [htmlClass, setHtmlClass] = useState('')

  useEffect(() => {
    setHtmlClass(document.documentElement.className)
  }, [])

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-sm z-50">
        <button onClick={(e) => {
             e.preventDefault(); 
             setTheme(theme === "light" ? "dark" : "light")
             sessionStorage.setItem("emsTheme", theme === "light" ? "dark" : "light")
          }
        }>
                Change Theme
                </button>
      <div>Theme: {theme}</div>
      <div>System Theme: {systemTheme}</div>
      <div>Resolved Theme: {resolvedTheme}</div>
      <div>Available Themes: {themes.join(', ')}</div>
      <div>HTML Class: {htmlClass}</div>
    </div>
  )
}