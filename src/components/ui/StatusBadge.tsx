import type { TaskStatus } from '../../types/database'

interface Props {
  status: TaskStatus
}

const TONES: Record<TaskStatus, { bg: string; color: string; border: string }> = {
  todo:        { bg: 'transparent',        color: 'var(--ink-3)',      border: 'var(--line)' },
  in_progress: { bg: 'var(--accent-soft)', color: 'var(--accent-ink)', border: 'var(--accent-soft)' },
  done:        { bg: 'var(--ok-soft)',      color: 'var(--ok)',         border: 'var(--ok-soft)' },
}

const LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export function StatusBadge({ status }: Props) {
  const t = TONES[status] ?? TONES.todo
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1.4,
      borderRadius: 999, background: t.bg, color: t.color,
      border: `1px solid ${t.border}`, whiteSpace: 'nowrap',
    }}>
      {LABELS[status]}
    </span>
  )
}
