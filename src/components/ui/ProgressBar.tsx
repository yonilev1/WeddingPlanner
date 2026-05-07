interface Props {
  value: number
  className?: string
  size?: 'sm' | 'md'
  color?: string
  track?: string
}

export function ProgressBar({ value, className = '', size = 'sm', color, track }: Props) {
  const height = size === 'sm' ? 3 : 5
  const clamped = Math.min(100, Math.max(0, value))
  const barColor = color ?? (clamped === 100 ? 'var(--ok)' : 'var(--accent)')
  const trackColor = track ?? 'var(--line)'
  return (
    <div
      className={className}
      style={{ height, background: trackColor, borderRadius: 999, overflow: 'hidden', width: '100%' }}
    >
      <div style={{
        width: `${clamped}%`,
        height: '100%',
        background: barColor,
        borderRadius: 999,
        transition: 'width 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }} />
    </div>
  )
}
