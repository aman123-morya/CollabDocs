import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, storage } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(storage.username)
  const [token, setToken] = useState(storage.token)

  const logout = useCallback(() => {
    storage.clear()
    setUsername(null)
    setToken(null)
  }, [])

  // any 401 from the API (expired token) signs the user out and the router sends them to /login
  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])

  const finish = useCallback((data) => {
    storage.save(data.token, data.username)
    setToken(data.token)
    setUsername(data.username)
  }, [])

  const value = useMemo(() => ({
    username,
    token,
    isAuthed: Boolean(username && token),
    login: async (login, password) =>
      finish(await api('/api/auth/login', { method: 'POST', auth: false, body: { username: login, password } })),
    register: async (name, email, password) =>
      finish(await api('/api/auth/register', { method: 'POST', auth: false, body: { username: name, email, password } })),
    logout,
  }), [username, token, finish, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
