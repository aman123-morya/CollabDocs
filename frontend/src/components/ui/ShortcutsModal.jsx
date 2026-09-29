import { Modal } from './Modal'

const SHORTCUTS = [
  ['Bold', 'Ctrl / Cmd + B'],
  ['Italic', 'Ctrl / Cmd + I'],
  ['Undo', 'Ctrl / Cmd + Z'],
  ['Redo', 'Ctrl / Cmd + Y'],
]

export function ShortcutsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width="max-w-sm">
      <ul className="divide-y divide-line">
        {SHORTCUTS.map(([label, keys]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm">
            <span>{label}</span>
            <kbd className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs">{keys}</kbd>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Everything is saved automatically as you type - there's no save shortcut to remember.</p>
    </Modal>
  )
}
