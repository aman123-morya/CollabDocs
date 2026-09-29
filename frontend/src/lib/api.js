import BACKEND_BASE_URL from '../config'

export const storage = {
  get token() { return localStorage.getItem('jwtKey') },
  get username() { return localStorage.getItem('username') },
  save(token, username) {
    localStorage.setItem('jwtKey', token)
    localStorage.setItem('username', username)
  },
  clear() {
    localStorage.removeItem('jwtKey')
    localStorage.removeItem('username')
  },
}

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields || null
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

/** JSON fetch helper: attaches the token, turns error bodies into readable messages. */
export async function api(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && storage.token) headers.Authorization = storage.token

  let res
  try {
    res = await fetch(BACKEND_BASE_URL + path, {
      method, headers, signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  const text = await res.text()
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized()
    const fields = data && typeof data === 'object' ? data.error : null   // validation errors {field: message}
    const message =
      (fields && Object.values(fields)[0]) ||
      (data && data.errorMessage) ||
      (res.status === 401 ? 'Your session has expired. Please sign in again.'
        : res.status === 403 ? 'You do not have permission to do that.'
        : res.status === 404 ? 'Not found.'
        : 'Something went wrong. Please try again.')
    throw new ApiError(message, res.status, fields)
  }
  return data
}

export const docsApi = {
  list: (signal) => api('/api/docs/all', { signal }),
  get: (id, signal) => api(`/api/docs/${id}`, { signal }),
  changes: (id, signal) => api(`/api/docs/changes/${id}`, { signal }),
  create: (title) => api('/api/docs/create', { method: 'POST', body: { title } }),
  rename: (id, title) => api(`/api/docs/rename/${id}`, { method: 'PATCH', body: { title } }),
  remove: (id) => api(`/api/docs/delete/${id}`, { method: 'DELETE' }),
  addUser: (id, username, permission) => api(`/api/docs/users/add/${id}`, { method: 'PATCH', body: { username, permission } }),
  setPermission: (id, username, permission) => api(`/api/docs/users/permission/${id}`, { method: 'PATCH', body: { username, permission } }),
  removeUser: (id, username) => api(`/api/docs/users/remove/${id}`, { method: 'DELETE', body: { username, permission: 'VIEW' } }),
  setAccess: (id, generalAccess) => api(`/api/docs/access/${id}`, { method: 'PATCH', body: { generalAccess } }),
}

/** Downloads a document as a .txt file (needs the auth header, so a plain <a href> won't work). */
export async function downloadDoc(id, fallbackTitle) {
  const res = await fetch(`${BACKEND_BASE_URL}/api/docs/export/${id}`, {
    headers: storage.token ? { Authorization: storage.token } : {},
  })
  if (!res.ok) throw new ApiError('Could not download the document', res.status)
  const blob = await res.blob()
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')
  const filename = match ? match[1] : `${(fallbackTitle || 'document').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'document'}.txt`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const usersApi = {
  me: () => api('/api/users/me'),
  search: (q, signal) => api(`/api/users/search?q=${encodeURIComponent(q)}`, { signal }),
}
