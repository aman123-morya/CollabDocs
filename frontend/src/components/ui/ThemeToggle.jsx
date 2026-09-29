import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'

export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button className="icon-btn" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
