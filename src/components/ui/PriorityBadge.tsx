interface Props {
  priority: number | null
  size?: 'sm' | 'md'
}

const TONES: Record<number, { bg: string; color: string; border: string }> = {
  5: { bg: 'var(--bad-soft)',  color: 'var(--bad)',   border: 'var(--bad-soft)' },
  4: { bg: 'var(--warn-soft)', color: 'var(--warn)',  border: 'var(--warn-soft)' },
  3: { bg: 'var(--bg-soft)',   color: 'var(--ink-3)', border: 'var(--line)' },
  2: { bg: 'var(--bg-soft)',   color: 'var(--ink-3)', border: 'var(--line)' },
  1: { bg: 'transparent',      color: 'var(--ink-4)', border: 'var(--line)' },
}

export function PriorityBadge({ priority, size = 'sm' }: Props) {
  if (!priority) return null
  const t = TONES[priority] ?? TONES[3]
  const fs = size === 'sm' ? 11 : 13
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      fontSize: fs, fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1.4,
      borderRadius: 999, background: t.bg, color: t.color,
      border: `1px solid ${t.border}`, whiteSpace: 'nowrap',
    }}>
      P{priority}
    </span>
  )
}
