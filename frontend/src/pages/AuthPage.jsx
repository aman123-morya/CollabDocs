import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, Mail, User, Users, Zap, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Logo } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'
import { ThemeToggle } from '../components/ui/ThemeToggle'

function Field({ icon: Icon, label, error, right, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input {...props} className={`input pl-10 ${right ? 'pr-11' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`} />
        {right}
      </span>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

const FEATURES = [
  { icon: Zap, title: 'Real-time editing', text: 'See every keystroke and cursor the moment it happens.' },
  { icon: Users, title: 'Conflict-free by design', text: 'CRDT-based merging: nobody overwrites anybody.' },
  { icon: ShieldCheck, title: 'You control access', text: 'Share with people or by link, view-only or edit.' },
]

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(''); setFields({})
    if (!isLogin && form.password.length < 8) return setFields({ password: 'Use at least 8 characters' })
    setBusy(true)
    try {
      if (isLogin) await login(form.username, form.password)
      else await register(form.username, form.email, form.password)
      navigate('/docs', { replace: true })
    } catch (err) {
      if (err.fields) setFields(err.fields)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold"><img src="/favicon.svg" width={34} height={34} alt="" className="rounded-lg" /> CollabDocs</div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Write together,<br />in real time.</h1>
          <p className="mt-4 text-white/80">A fast, clean editor built for teams. Open a document, invite people, and start typing.</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon size={20} /></span>
                <span><span className="block font-medium">{title}</span><span className="text-sm text-white/75">{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">Powered by CRDTs, Spring Boot &amp; PostgreSQL</p>
      </aside>

      {/* form */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-sm animate-pop">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-semibold tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-1.5 text-sm text-muted">{isLogin ? 'Sign in to continue to your documents.' : 'It takes less than a minute.'}</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            )}
            <Field icon={User} label={isLogin ? 'Username or email' : 'Username'} value={form.username} onChange={set('username')}
              autoComplete="username" autoFocus required placeholder={isLogin ? 'alice' : 'Pick a username'} error={!isLogin && fields.username} />
            {!isLogin && (
              <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email"
                required placeholder="you@example.com" error={fields.email} />
            )}
            <Field icon={Lock} label="Password" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'} required placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
              error={!isLogin && fields.password}
              right={<button type="button" onClick={() => setShow((s) => !s)} className="icon-btn absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
            <button className="btn-primary w-full py-2.5" disabled={busy || !form.username || !form.password || (!isLogin && !form.email)}>
              {busy && <Spinner size={16} />} {isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link to={isLogin ? '/register' : '/login'} className="font-medium text-brand hover:underline">{isLogin ? 'Sign up' : 'Sign in'}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
