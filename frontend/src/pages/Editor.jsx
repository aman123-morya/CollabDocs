import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import 'quill-cursors/css'
import { ArrowLeft, Bold, Download, Eye, Italic, Redo2, Share2, Undo2, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { WS_URL } from '../config'
import { docsApi, downloadDoc, storage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ClientCrdt } from '../lib/clientCrdt'
import { colorFor, countWords, throttle } from '../lib/util'
import { AvatarStack } from '../components/ui/Avatar'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { UserMenu } from '../components/ui/UserMenu'
import { ShareModal } from '../components/docs/dialogs'

Quill.register('modules/cursors', QuillCursors)
const Delta = Quill.import('delta')

const attrsOf = (bold, italic) => {
  const a = {}
  if (bold) a.bold = true
  if (italic) a.italic = true
  return Object.keys(a).length ? a : undefined
}

const STATUS = {
  connecting: { label: 'Connecting...', dot: 'bg-warn animate-pulse' },
  live: { label: 'Live - autosaved', dot: 'bg-ok' },
  reconnecting: { label: 'Reconnecting...', dot: 'bg-warn animate-pulse' },
  offline: { label: 'Offline', dot: 'bg-danger' },
}

function ToolbarButton({ label, active, disabled, onClick, children }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}   // keep the text selection while clicking
      onClick={onClick}
      className={`icon-btn ${active ? 'bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand' : ''}`}>
      {children}
    </button>
  )
}

export default function Editor() {
  const { docId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { username, logout } = useAuth()

  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [title, setTitle] = useState(state?.title || '')
  const [status, setStatus] = useState('connecting')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ words: 0, chars: 0 })
  const [format, setFormat] = useState({})
  const [sharing, setSharing] = useState(false)

  const hostRef = useRef(null)
  const quillRef = useRef(null)

  const canEdit = meta?.permission === 'OWNER' || meta?.permission === 'EDIT'

  // ---- 1. load document info (title, my permission) ----
  useEffect(() => {
    const ctrl = new AbortController()
    setMeta(null); setError(null)
    docsApi.get(docId, ctrl.signal)
      .then((d) => { setMeta(d); setTitle(d.title); document.title = `${d.title} - CollabDocs` })
      .catch((e) => { if (e.name !== 'AbortError') setError(e) })
    return () => { ctrl.abort(); document.title = 'CollabDocs' }
  }, [docId])

  // ---- 2. editor + realtime sync ----
  useEffect(() => {
    if (!meta || !hostRef.current) return undefined

    const editable = meta.permission === 'OWNER' || meta.permission === 'EDIT'
    const clientId = `${username}~${Math.random().toString(36).slice(2, 8)}`
    const crdt = new ClientCrdt(clientId)
    const host = document.createElement('div')
    hostRef.current.appendChild(host)

    const quill = new Quill(host, {
      formats: ['bold', 'italic'],
      placeholder: editable ? 'Start typing...' : '',
      readOnly: true,
      modules: { toolbar: false, history: { userOnly: true, delay: 800 }, cursors: true },
    })
    quillRef.current = quill
    const cursors = quill.getModule('cursors')
    const knownCursors = new Set()

    let ready = false
    let version = 0
    let buffer = []
    let disposed = false
    let retryTimer

    const refreshStats = () => {
      const text = quill.getText()
      setStats({ words: countWords(text), chars: Math.max(0, text.length - 1) })
    }

    const paint = () => {
      const len = quill.getLength()
      if (len > 1) quill.deleteText(0, len - 1, 'silent')
      const ops = crdt.runs().map((r) => ({ insert: r.text, attributes: attrsOf(r.bold, r.italic) }))
      if (ops.length) quill.updateContents(new Delta(ops), 'silent')
      quill.history.clear()
      refreshStats()
    }

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authentication: storage.token || '' },
      reconnectDelay: 2000,
    })

    const publish = (op) => {
      client.publish({ destination: `/docs/change/${docId}`, body: JSON.stringify({ ...op, origin: clientId }) })
    }

    // ---- apply a remote operation to the replica and to the editor ----
    const apply = (m) => {
      if (m.operation === 'insert') {
        const r = crdt.integrate(m)
        if (r === 'gap') return resync()
        if (!r) return null
        quill.updateContents(new Delta().retain(r.index).insert(r.item.content, attrsOf(r.item.isbold, r.item.isitalic)), 'silent')
      } else if (m.operation === 'delete') {
        const idx = crdt.remoteDelete(m.id)
        if (idx >= 0) quill.updateContents(new Delta().retain(idx).delete(1), 'silent')
      } else if (m.operation === 'format') {
        const idx = crdt.remoteFormat(m.id, m.isbold, m.isitalic)
        if (idx >= 0) quill.updateContents(new Delta().retain(idx).retain(1, { bold: m.isbold ? true : null, italic: m.isitalic ? true : null }), 'silent')
      }
      return null
    }

    const handle = (m) => {
      if (m.seq && m.seq <= version) return              // already contained in the snapshot
      if (m.seq && m.seq > version + 1) { resync(); return }   // we missed something -> start over from the server state
      if (m.seq) version = m.seq
      if (m.origin === clientId) return                  // our own edit echoed back
      apply(m)
      refreshStats()
    }

    async function resync() {
      ready = false
      quill.enable(false)
      buffer = []                                        // messages that arrive while we fetch are queued here
      try {
        const data = await docsApi.changes(docId)
        if (disposed) return
        crdt.reset(data.items)
        version = data.version
        paint()
        ready = true
        const queued = buffer
        buffer = []
        queued.forEach(handle)
        quill.enable(editable)
        setStatus('live')
      } catch (e) {
        if (disposed) return
        if (e.status === 401) return
        if (e.status === 403 || e.status === 404) { setError(e); return }
        setStatus('reconnecting')
        retryTimer = setTimeout(resync, 2000)
      }
    }

    // ---- local edits -> CRDT operations -> server ----
    quill.on('text-change', (delta, _old, source) => {
      if (source === 'silent') return
      if (!ready || !client.connected) return
      crdt.applyLocalDelta(delta.ops).forEach(publish)
      refreshStats()
    })

    const sendCursor = throttle((range) => {
      if (client.connected) client.publish({ destination: `/docs/cursor/${docId}`, body: JSON.stringify({ index: range.index, length: range.length }) })
    }, 90)

    quill.on('selection-change', (range, _old, source) => {
      if (range) {
        setFormat(quill.getFormat(range))
        if (source !== 'silent' && ready) sendCursor(range)
      }
    })
    quill.on('editor-change', (type) => {
      if (type === 'text-change') setFormat(quill.getFormat())
    })

    // ---- connection ----
    client.onConnect = () => {
      // Order matters: the server announces presence when the *changes* topic is subscribed,
      // so the presence/cursor listeners must already be in place by then.
      client.subscribe(`/docs/broadcast/usernames/${docId}`, (msg) => {
        const list = (JSON.parse(msg.body).usernames || [])
        setUsers(list)
        const others = new Set(list.filter((n) => n !== username))
        others.forEach((n) => { if (!knownCursors.has(n)) { cursors.createCursor(n, n, colorFor(n)); knownCursors.add(n) } })
        knownCursors.forEach((n) => { if (!others.has(n)) { cursors.removeCursor(n); knownCursors.delete(n) } })
      })
      client.subscribe(`/docs/broadcast/cursors/${docId}`, (msg) => {
        const c = JSON.parse(msg.body)
        if (!c || c.username === username || !ready) return
        if (!knownCursors.has(c.username)) { cursors.createCursor(c.username, c.username, colorFor(c.username)); knownCursors.add(c.username) }
        cursors.moveCursor(c.username, { index: c.index, length: c.length })
      })
      client.subscribe(`/docs/broadcast/changes/${docId}`, (msg) => {
        const m = JSON.parse(msg.body)
        if (!ready) buffer.push(m); else handle(m)
      })
      resync()
    }
    client.onWebSocketClose = () => {
      if (disposed) return
      ready = false
      quill.enable(false)
      setStatus((s) => (s === 'offline' ? s : 'reconnecting'))
    }
    client.onStompError = (frame) => {
      const message = frame.headers?.message || ''
      setStatus('offline')
      if (/invalid or expired|missing credentials/i.test(message)) {
        client.deactivate()
        toast.error('Your session expired. Please sign in again.')
        logout()
      } else if (/do not have access/i.test(message)) {
        client.deactivate()
        setError({ status: 403, message: 'You do not have access to this document.' })
      }
    }
    client.activate()

    // Ctrl/Cmd+S: nothing to do, but people press it anyway
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); toast('Everything is saved automatically') }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      window.removeEventListener('keydown', onKey)
      client.deactivate()
      quillRef.current = null
      host.remove()
    }
  }, [meta, docId, username, logout])

  // ---- title ----
  const saveTitle = useCallback(async () => {
    const next = title.trim()
    if (!meta || !canEdit) return
    if (!next) { setTitle(meta.title); return }
    if (next === meta.title) return
    try {
      await docsApi.rename(docId, next)
      setMeta((m) => ({ ...m, title: next }))
      document.title = `${next} - CollabDocs`
    } catch (e) { toast.error(e.message); setTitle(meta.title) }
  }, [title, meta, canEdit, docId])

  const toggle = (name) => {
    const q = quillRef.current
    if (!q) return
    q.focus()
    q.format(name, !q.getFormat()[name], 'user')
    setFormat(q.getFormat())
  }

  const others = useMemo(() => users.filter((u) => u !== username), [users, username])

  // ---- error / loading ----
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-sm p-8 text-center">
          <p className="text-lg font-semibold">{error.status === 404 ? 'Document not found' : error.status === 403 ? 'No access' : 'Something went wrong'}</p>
          <p className="mt-1 text-sm text-muted">{error.message}</p>
          <button className="btn-primary mt-6" onClick={() => navigate('/docs')}>Back to documents</button>
        </div>
      </div>
    )
  }

  const st = STATUS[status]
  const isOwner = meta?.permission === 'OWNER'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button className="icon-btn" onClick={() => navigate('/docs')} aria-label="Back to documents"><ArrowLeft size={19} /></button>
          <img src="/favicon.svg" width={28} height={28} alt="" className="hidden rounded-md sm:block" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} maxLength={255}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitle(meta?.title || ''); e.currentTarget.blur() } }}
            readOnly={!canEdit} aria-label="Document title" placeholder="Untitled document"
            className="min-w-0 max-w-md flex-1 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-[15px] font-semibold hover:border-line focus:border-brand focus:bg-surface focus:outline-none read-only:hover:border-transparent" />
          <span className="ml-1 hidden items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted md:inline-flex">
            <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.label}
          </span>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {users.length > 0 && <AvatarStack names={users} max={4} size={28} />}
            {meta && (
              <button className="icon-btn" title="Download as .txt" aria-label="Download as .txt"
                onClick={() => downloadDoc(docId, meta.title).catch((e) => toast.error(e.message))}>
                <Download size={17} />
              </button>
            )}
            {meta && (
              <button className="btn-primary px-3.5 py-1.5" onClick={() => setSharing(true)}>
                <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* formatting toolbar */}
        <div className="flex items-center gap-1 border-t border-line px-3 py-1.5 sm:px-4">
          <ToolbarButton label="Undo (Ctrl+Z)" disabled={!canEdit || status !== 'live'} onClick={() => quillRef.current?.history.undo()}><Undo2 size={17} /></ToolbarButton>
          <ToolbarButton label="Redo (Ctrl+Y)" disabled={!canEdit || status !== 'live'} onClick={() => quillRef.current?.history.redo()}><Redo2 size={17} /></ToolbarButton>
          <span className="mx-1.5 h-5 w-px bg-line" />
          <ToolbarButton label="Bold (Ctrl+B)" active={!!format.bold} disabled={!canEdit || status !== 'live'} onClick={() => toggle('bold')}><Bold size={17} /></ToolbarButton>
          <ToolbarButton label="Italic (Ctrl+I)" active={!!format.italic} disabled={!canEdit || status !== 'live'} onClick={() => toggle('italic')}><Italic size={17} /></ToolbarButton>
          <span className="ml-auto text-xs text-muted md:hidden"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${st.dot}`} />{st.label}</span>
        </div>
      </header>

      {meta && !canEdit && (
        <div className="flex items-center justify-center gap-2 bg-brand-soft px-4 py-2 text-sm text-brand">
          <Eye size={16} /> You have view-only access to this document.
        </div>
      )}
      {status === 'reconnecting' && (
        <div className="flex items-center justify-center gap-2 bg-warn/15 px-4 py-2 text-sm text-warn">
          <WifiOff size={16} /> Connection lost - trying to reconnect. Editing is paused so nothing gets lost.
        </div>
      )}

      <main className="flex-1 px-2 py-6 sm:px-6 sm:py-8">
        {!meta ? (
          <div className="mx-auto max-w-[816px] rounded-xl border border-line bg-surface p-14 shadow-paper">
            <div className="skeleton h-5 w-2/3" /><div className="skeleton mt-4 h-4 w-full" /><div className="skeleton mt-3 h-4 w-5/6" /><div className="skeleton mt-3 h-4 w-3/4" />
          </div>
        ) : (
          <div className="paper mx-auto max-w-[816px] rounded-xl border border-line bg-surface shadow-paper">
            <div ref={hostRef} />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-surface/85 px-4 py-2 text-xs text-muted backdrop-blur-lg">
        <div className="mx-auto flex max-w-[816px] items-center justify-between">
          <span>{stats.words.toLocaleString()} words &middot; {stats.chars.toLocaleString()} characters</span>
          <span>{others.length > 0 ? `${others.length} other${others.length > 1 ? 's' : ''} here now` : isOwner ? 'Only you' : ''}</span>
        </div>
      </footer>

      <ShareModal doc={sharing && meta ? { id: meta.id, title: meta.title } : null} onClose={() => setSharing(false)}
        onChanged={(d) => setMeta((m) => ({ ...m, sharedWith: d.sharedWith, generalAccess: d.generalAccess }))} />
    </div>
  )
}
