import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ dark: false, toggle() {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0c13' : '#4f46e5')
  }, [dark])

  const toggle = useCallback(() => {
    setDark((d) => {
      try { localStorage.setItem('theme', d ? 'light' : 'dark') } catch { /* private mode */ }
      return !d
    })
  }, [])

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>
}
