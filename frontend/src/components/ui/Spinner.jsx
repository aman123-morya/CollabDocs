import { Loader2 } from 'lucide-react'

export const Spinner = ({ size = 18, className = '' }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} aria-label="Loading" />
)

export const FullPageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-canvas text-brand"><Spinner size={30} /></div>
)
