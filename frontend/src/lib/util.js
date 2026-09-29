const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "just now", "5 minutes ago", "yesterday", "3 Mar" */
export function timeAgo(iso) {
  if (!iso) return ''
  const sec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(sec)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(sec / 86400), 'day')
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: abs > 86400 * 300 ? 'numeric' : undefined })
}

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16', '#0ea5e9', '#f97316']

/** Stable colour per username, so the same person always looks the same everywhere. */
export function colorFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export const initials = (name = '?') => name.slice(0, 2).toUpperCase()

export const debounce = (fn, ms) => {
  let t
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
  d.cancel = () => clearTimeout(t)
  return d
}

export const throttle = (fn, ms) => {
  let last = 0, timer
  return (...a) => {
    const now = Date.now()
    clearTimeout(timer)
    if (now - last >= ms) { last = now; fn(...a) }
    else timer = setTimeout(() => { last = Date.now(); fn(...a) }, ms - (now - last))
  }
}

export const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)
