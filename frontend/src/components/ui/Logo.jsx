export function Logo({ size = 32, text = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/favicon.svg" width={size} height={size} alt="" className="rounded-lg" />
      {text && <span className="text-[17px] font-semibold tracking-tight text-ink">CollabDocs</span>}
    </span>
  )
}
