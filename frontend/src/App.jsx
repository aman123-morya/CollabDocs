import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider, useTheme } from './lib/theme'
import { FullPageLoader } from './components/ui/Spinner'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

// Quill is ~200 KB: only download it when someone actually opens a document
const Editor = lazy(() => import('./pages/Editor'))

function Protected({ children }) {
  const { isAuthed } = useAuth()
  const location = useLocation()
  return isAuthed ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function GuestOnly({ children }) {
  const { isAuthed } = useAuth()
  const location = useLocation()
  return isAuthed ? <Navigate to={location.state?.from || '/docs'} replace /> : children
}

function ThemedToaster() {
  const { dark } = useTheme()
  return <Toaster position="bottom-right" theme={dark ? 'dark' : 'light'} richColors closeButton />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/docs" replace />} />
              <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
              <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
              <Route path="/docs" element={<Protected><Dashboard /></Protected>} />
              <Route path="/view" element={<Navigate to="/docs" replace />} />
              <Route path="/edit/:docId" element={<Protected><Editor /></Protected>} />
              <Route path="*" element={<Navigate to="/docs" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  )
}
