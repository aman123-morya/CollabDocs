import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, FileText, MoreVertical, PencilLine, Share2, Trash2, Users } from 'lucide-react'
import { Avatar, AvatarStack } from '../ui/Avatar'
import { downloadDoc } from '../../lib/api'
import { toast } from 'sonner'
import { timeAgo } from '../../lib/util'

function ActionsMenu({ doc, onRename, onShare, onDelete }) {
  const navigate = useNavigate()
  const canEdit = doc.permission === 'OWNER' || doc.permission === 'EDIT'
  const items = [
    { label: 'Open', icon: FileText, run: () => navigate(`/edit/${doc.id}`, { state: { title: doc.title } }), show: true },
    { label: 'Rename', icon: PencilLine, run: onRename, show: canEdit },
    { label: 'Share', icon: Share2, run: onShare, show: true },
    { label: 'Download .txt', icon: Download, run: () => downloadDoc(doc.id, doc.title).catch((e) => toast.error(e.message)), show: true },
    { label: 'Delete', icon: Trash2, run: onDelete, show: doc.permission === 'OWNER', danger: true },
  ].filter((i) => i.show)

  return (
    <Menu as="div" className="relative" data-actions>
      <Menu.Button className="icon-btn h-8 w-8" aria-label={`Actions for ${doc.title}`}><MoreVertical size={17} /></Menu.Button>
      <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0 scale-95">
        <Menu.Items className="absolute right-0 z-30 mt-1 w-44 origin-top-right rounded-xl border border-line bg-surface p-1.5 shadow-pop focus:outline-none">
          {items.map(({ label, icon: Icon, run, danger }) => (
            <Menu.Item key={label}>
              {({ active }) => (
                <button onClick={run} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${active ? 'bg-surface-2' : ''} ${danger ? 'text-danger' : ''}`}>
                  <Icon size={16} className={danger ? '' : 'text-muted'} /> {label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

function AccessBadge({ doc }) {
  if (doc.permission === 'VIEW') return <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"><Eye size={11} /> View only</span>
  if (doc.permission === 'EDIT') return <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"><PencilLine size={11} /> Can edit</span>
  return null
}

export function DocCard(props) {
  const { doc } = props
  const navigate = useNavigate()
  const open = () => navigate(`/edit/${doc.id}`, { state: { title: doc.title } })
  const people = [doc.owner, ...doc.sharedWith.map((s) => s.username)]

  return (
    <article onClick={(e) => { if (!e.target.closest('[data-actions]')) open() }} tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && open()} role="link"
      className="card group flex cursor-pointer flex-col p-4 transition duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop">
      <div className="relative mb-4 h-32 overflow-hidden rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
        {doc.preview
          ? <p className="line-clamp-5 break-words text-[11px] leading-relaxed text-muted">{doc.preview}</p>
          : <p className="text-[11px] italic text-muted/60">Empty document</p>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-2/90 to-transparent" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold" title={doc.title}>{doc.title}</h3>
          <p className="mt-0.5 text-xs text-muted">Edited {timeAgo(doc.updatedAt)}</p>
        </div>
        <ActionsMenu {...props} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <AvatarStack names={people} max={3} size={24} />
          {people.length > 1 && <span className="flex items-center gap-1 text-xs text-muted"><Users size={12} />{people.length}</span>}
        </span>
        <AccessBadge doc={doc} />
      </div>
    </article>
  )
}

export function DocRow(props) {
  const { doc } = props
  const navigate = useNavigate()
  const open = () => navigate(`/edit/${doc.id}`, { state: { title: doc.title } })
  return (
    <div onClick={(e) => { if (!e.target.closest('[data-actions]')) open() }} tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && open()} role="link"
      className="group flex cursor-pointer items-center gap-4 border-b border-line px-4 py-3 transition first:rounded-t-2xl last:rounded-b-2xl last:border-b-0 hover:bg-surface-2/70">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText size={19} /></span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{doc.title}</h3>
        <p className="truncate text-xs text-muted">{doc.preview || 'Empty document'}</p>
      </div>
      <span className="hidden items-center gap-2 text-sm text-muted md:flex md:w-44"><Avatar name={doc.owner} size={22} /> <span className="truncate">{doc.owner}</span></span>
      <span className="hidden w-28 text-sm text-muted sm:block">{timeAgo(doc.updatedAt)}</span>
      <span className="hidden w-24 lg:block"><AccessBadge doc={doc} /></span>
      <ActionsMenu {...props} />
    </div>
  )
}
