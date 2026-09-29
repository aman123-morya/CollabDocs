import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Globe, Lock, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { docsApi, usersApi } from '../../lib/api'
import { debounce } from '../../lib/util'

/* ------------------------------------------------------------------ create */
export function CreateDocModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) setTitle('') }, [open])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      onCreated(await docsApi.create(title.trim() || 'Untitled document'))
      onClose()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New document" description="Give it a name - you can change it any time.">
      <form onSubmit={submit}>
        <input className="input" autoFocus maxLength={255} placeholder="Untitled document" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner size={16} />} Create</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ rename */
export function RenameModal({ doc, onClose, onRenamed }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (doc) setTitle(doc.title) }, [doc])

  async function submit(e) {
    e.preventDefault()
    const next = title.trim()
    if (!next) return
    setBusy(true)
    try {
      await docsApi.rename(doc.id, next)
      onRenamed(doc.id, next)
      toast.success('Document renamed')
      onClose()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <Modal open={!!doc} onClose={onClose} title="Rename document">
      <form onSubmit={submit}>
        <input className="input" autoFocus maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} onFocus={(e) => e.target.select()} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || !title.trim()}>{busy && <Spinner size={16} />} Save</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ delete */
export function DeleteModal({ doc, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false)
  async function confirm() {
    setBusy(true)
    try {
      await docsApi.remove(doc.id)
      onDeleted(doc.id)
      toast.success('Document deleted')
      onClose()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={!!doc} onClose={onClose} title="Delete this document?"
      description={doc ? `"${doc.title}" will be permanently deleted for you and everyone it is shared with. This cannot be undone.` : ''}>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={confirm} disabled={busy}>{busy && <Spinner size={16} />} Delete</button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------- share */
const ACCESS = [
  { value: 'PRIVATE', label: 'Restricted', hint: 'Only people added below can open', icon: Lock },
  { value: 'ANYONE_VIEW', label: 'Anyone signed in can view', hint: 'Anyone with the link can read', icon: Globe },
  { value: 'ANYONE_EDIT', label: 'Anyone signed in can edit', hint: 'Anyone with the link can edit', icon: Globe },
]

export function ShareModal({ doc: summary, onClose, onChanged }) {
  const [doc, setDoc] = useState(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [permission, setPermission] = useState('EDIT')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchRef = useRef(null)

  const isOwner = doc?.permission === 'OWNER'
  const open = !!summary

  // always share from fresh server state - the dashboard copy may be stale
  useEffect(() => {
    if (!summary) return
    setDoc(null); setQuery(''); setSuggestions([])
    docsApi.get(summary.id).then(setDoc).catch((e) => { toast.error(e.message); onClose() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.id])

  useEffect(() => {
    searchRef.current = debounce(async (q) => {
      if (q.trim().length < 2) return setSuggestions([])
      try { setSuggestions(await usersApi.search(q.trim())) } catch { setSuggestions([]) }
    }, 220)
    return () => searchRef.current.cancel()
  }, [])

  const update = (next) => { setDoc(next); onChanged(next) }

  async function add(name) {
    const target = (name ?? query).trim()
    if (!target) return
    setBusy(true)
    try {
      await docsApi.addUser(doc.id, target, permission)
      update(await docsApi.get(doc.id))
      setQuery(''); setSuggestions([])
      toast.success(`Shared with ${target}`)
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  async function changePermission(username, value) {
    try { await docsApi.setPermission(doc.id, username, value); update(await docsApi.get(doc.id)) }
    catch (err) { toast.error(err.message) }
  }

  async function remove(username) {
    try { await docsApi.removeUser(doc.id, username); update(await docsApi.get(doc.id)); toast.success(`Removed ${username}`) }
    catch (err) { toast.error(err.message) }
  }

  async function setAccess(value) {
    try { update(await docsApi.setAccess(doc.id, value)) } catch (err) { toast.error(err.message) }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/edit/${doc.id}`)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { toast.error('Could not copy - copy the address from the browser instead') }
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-lg" title={`Share "${summary?.title ?? ''}"`}>
      {!doc ? (
        <div className="flex justify-center py-10 text-brand"><Spinner size={26} /></div>
      ) : (
        <div className="space-y-6">
          {/* add people */}
          <div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <UserPlus size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input pl-10" placeholder="Add people by username or email" value={query}
                  onChange={(e) => { setQuery(e.target.value); searchRef.current(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop">
                    {suggestions.map((s) => (
                      <li key={s.username}>
                        <button type="button" onClick={() => add(s.username)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2">
                          <Avatar name={s.username} size={26} /> {s.username}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <select className="input w-auto pr-8" value={permission} onChange={(e) => setPermission(e.target.value)} aria-label="Permission for new person">
                <option value="EDIT">Can edit</option>
                <option value="VIEW">Can view</option>
              </select>
              <button className="btn-primary" onClick={() => add()} disabled={busy || !query.trim()}>{busy ? <Spinner size={16} /> : 'Add'}</button>
            </div>
          </div>

          {/* people with access */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">People with access</h4>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              <li className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <Avatar name={doc.owner} size={32} />
                <span className="flex-1 truncate text-sm font-medium">{doc.owner}</span>
                <span className="text-xs text-muted">Owner</span>
              </li>
              {doc.sharedWith.map((u) => (
                <li key={u.username} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                  <Avatar name={u.username} size={32} />
                  <span className="flex-1 truncate text-sm">{u.username}</span>
                  {isOwner ? (
                    <>
                      <select className="rounded-lg border border-line bg-surface px-2 py-1 text-xs" value={u.permission}
                        onChange={(e) => changePermission(u.username, e.target.value)} aria-label={`Permission for ${u.username}`}>
                        <option value="EDIT">Can edit</option>
                        <option value="VIEW">Can view</option>
                      </select>
                      <button className="icon-btn h-8 w-8" onClick={() => remove(u.username)} aria-label={`Remove ${u.username}`}><X size={16} /></button>
                    </>
                  ) : <span className="text-xs text-muted">{u.permission === 'EDIT' ? 'Can edit' : 'Can view'}</span>}
                </li>
              ))}
              {doc.sharedWith.length === 0 && <li className="px-2 py-2 text-sm text-muted">Only you can access this document.</li>}
            </ul>
          </div>

          {/* general access */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">General access</h4>
            {isOwner ? (
              <select className="input" value={doc.generalAccess} onChange={(e) => setAccess(e.target.value)}>
                {ACCESS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            ) : (
              <p className="text-sm text-muted">{ACCESS.find((a) => a.value === doc.generalAccess)?.label}</p>
            )}
            <p className="mt-1.5 text-xs text-muted">{ACCESS.find((a) => a.value === doc.generalAccess)?.hint}</p>
          </div>

          <div className="flex justify-between border-t border-line pt-4">
            <button className="btn-secondary" onClick={copyLink}>{copied ? <Check size={16} className="text-ok" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}</button>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

