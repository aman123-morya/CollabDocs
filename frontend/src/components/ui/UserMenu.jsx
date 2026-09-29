import { Menu, Transition } from '@headlessui/react'
import { Keyboard, LogOut } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { Avatar } from './Avatar'
import { ShortcutsModal } from './ShortcutsModal'

export function UserMenu() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const [shortcuts, setShortcuts] = useState(false)

  return (
    <>
      <Menu as="div" className="relative">
        <Menu.Button className="rounded-full focus-visible:ring-offset-0" aria-label="Account menu"><Avatar name={username} size={34} /></Menu.Button>
        <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0 scale-95">
          <Menu.Items className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-xl border border-line bg-surface p-1.5 shadow-pop focus:outline-none">
            <div className="px-3 py-2">
              <p className="text-xs text-muted">Signed in as</p>
              <p className="truncate text-sm font-semibold">{username}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Menu.Item>
              {({ active }) => (
                <button onClick={() => setShortcuts(true)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${active ? 'bg-surface-2' : ''}`}>
                  <Keyboard size={16} className="text-muted" /> Keyboard shortcuts
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button onClick={() => { logout(); navigate('/login') }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-surface-2' : ''}`}>
                  <LogOut size={16} className="text-muted" /> Sign out
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />
    </>
  )
}
