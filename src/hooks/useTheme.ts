import { useState, useEffect } from 'react'

export function useTheme() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('darkMode')
      if (savedTheme !== null) return savedTheme === 'true'
      return true
    }
    return true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const toggleTheme = () => {
    const next = !darkMode
    console.debug(`[App] Changement de thème : ${next ? 'Sombre' : 'Clair'}`)
    setDarkMode(next)
  }

  return { darkMode, toggleTheme }
}
