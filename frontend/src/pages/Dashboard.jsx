import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilePlus2, FileText, LayoutGrid, List, Plus, Search, SearchX, X } from 'lucide-react'
import { toast } from 'sonner'
import { docsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Logo } from '../components/ui/Logo'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { UserMenu } from '../components/ui/UserMenu'
import { DocCard, DocRow } from '../components/docs/DocItem'
import { CreateDocModal, DeleteModal, RenameModal, ShareModal } from '../components/docs/dialogs'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Owned by me' },
  { id: 'shared', label: 'Shared with me' },
]

function Skeletons({ grid }) {
  return grid ? (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="card p-4"><div className="skeleton h-32" /><div className="skeleton mt-4 h-4 w-2/3" /><div className="skeleton mt-2 h-3 w-1/3" /></div>
      ))}
    </div>
  ) : (
    <div className="card divide-y divide-line">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton m-3 h-12" />)}</div>
  )
}

export default function Dashboard() {
  const { username } = useAuth()
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState(() => localStorage.getItem('docView') || 'grid')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [sharing, setSharing] = useState(null)

  useEffect(() => { document.title = 'My documents - CollabDocs' }, [])
  useEffect(() => { localStorage.setItem('docView', view) }, [view])

  const load = useCallback((signal) => {
    setError('')
    docsApi.list(signal).then(setDocs).catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setDocs([]) } })
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const visible = useMemo(() => {
    if (!docs) return []
    const q = query.trim().toLowerCase()
    const list = docs.filter((d) =>
      (filter === 'all' || (filter === 'mine' ? d.owner === username : d.owner !== username)) &&
      (!q || d.title.toLowerCase().includes(q) || d.preview?.toLowerCase().includes(q)))
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [docs, filter, query, sort, username])

  const patch = (id, changes) => setDocs((all) => all.map((d) => (d.id === id ? { ...d, ...changes } : d)))
  const actions = (doc) => ({
    doc,
    onRename: () => setRenaming(doc),
    onShare: () => setSharing(doc),
    onDelete: () => setDeleting(doc),
  })

  const counts = docs ? { all: docs.length, mine: docs.filter((d) => d.owner === username).length } : {}

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input rounded-full bg-surface-2 pl-10 pr-9" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search documents" />
            {query && <button className="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
          </div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0"><ThemeToggle /><UserMenu /></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hello, {username}</h1>
            <p className="mt-1 text-sm text-muted">{docs ? `${docs.length} document${docs.length === 1 ? '' : 's'}` : 'Loading your documents...'}</p>
          </div>
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={17} /> New document</button>
        </div>

        <div className="relative mt-6 md:hidden">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search documents" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${filter === f.id ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
                {f.label}{docs && f.id !== 'shared' ? <span className="ml-1.5 text-xs opacity-60">{counts[f.id]}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select className="input w-auto py-1.5 pr-8" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort documents">
              <option value="recent">Last edited</option>
              <option value="title">Title A-Z</option>
            </select>
            <div className="flex rounded-xl bg-surface-2 p-1">
              {[['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']].map(([id, Icon, label]) => (
                <button key={id} onClick={() => setView(id)} aria-label={label} aria-pressed={view === id}
                  className={`rounded-lg p-1.5 transition ${view === id ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}><Icon size={17} /></button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {docs === null ? <Skeletons grid={view === 'grid'} /> : error ? (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <p className="font-medium">We couldn't load your documents</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button className="btn-secondary mt-5" onClick={() => { setDocs(null); load() }}>Try again</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                {docs.length === 0 ? <FileText size={26} /> : <SearchX size={26} />}
              </span>
              <p className="mt-4 text-lg font-semibold">{docs.length === 0 ? 'Create your first document' : 'Nothing matches'}</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {docs.length === 0 ? 'Start writing and invite others to collaborate in real time.' : 'Try a different search term or filter.'}
              </p>
              {docs.length === 0 && <button className="btn-primary mt-6" onClick={() => setCreating(true)}><FilePlus2 size={17} /> New document</button>}
            </div>
          ) : view === 'grid' ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((d) => <DocCard key={d.id} {...actions(d)} />)}
            </div>
          ) : (
            <div className="card">{visible.map((d) => <DocRow key={d.id} {...actions(d)} />)}</div>
          )}
        </div>
      </main>

      <CreateDocModal open={creating} onClose={() => setCreating(false)}
        onCreated={(d) => { setDocs((all) => [d, ...(all || [])]); toast.success('Document created') }} />
      <RenameModal doc={renaming} onClose={() => setRenaming(null)} onRenamed={(id, title) => patch(id, { title })} />
      <DeleteModal doc={deleting} onClose={() => setDeleting(null)} onDeleted={(id) => setDocs((all) => all.filter((d) => d.id !== id))} />
      <ShareModal doc={sharing} onClose={() => setSharing(null)} onChanged={(d) => patch(d.id, { sharedWith: d.sharedWith, generalAccess: d.generalAccess })} />
    </div>
  )
}
