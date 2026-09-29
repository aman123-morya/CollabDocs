const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export default BACKEND_BASE_URL

export const WS_URL =
  import.meta.env.VITE_WS_URL || BACKEND_BASE_URL.replace(/^http/, 'ws') + '/docs/ws'
