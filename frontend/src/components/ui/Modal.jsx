import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-md' }) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 translate-y-3 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-100"
              leaveFrom="opacity-100" leaveTo="opacity-0 sm:scale-95">
              <Dialog.Panel className={`w-full ${width} rounded-2xl border border-line bg-surface p-6 shadow-pop`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
                    {description && <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>}
                  </div>
                  <button className="icon-btn -mr-2 -mt-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="mt-5">{children}</div>
                {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
