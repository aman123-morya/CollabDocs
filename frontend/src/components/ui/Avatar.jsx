import { colorFor, initials } from '../../lib/util'

export function Avatar({ name, size = 32, ring = false, title }) {
  return (
    <span
      title={title ?? name}
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ring ? 'ring-2 ring-surface' : ''}`}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  )
}

/** Overlapping avatars: "+N" after `max`. */
export function AvatarStack({ names, max = 3, size = 26 }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <span key={n} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={n} size={size} ring /></span>
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
