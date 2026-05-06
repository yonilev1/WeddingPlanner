interface Props {
  priority: number | null
  size?: 'sm' | 'md'
}

const CONFIG: Record<number, { label: string; classes: string }> = {
  1: { label: 'P1', classes: 'bg-stone-100 text-stone-400' },
  2: { label: 'P2', classes: 'bg-sky-100 text-sky-600' },
  3: { label: 'P3', classes: 'bg-amber-100 text-amber-600' },
  4: { label: 'P4', classes: 'bg-orange-100 text-orange-600' },
  5: { label: 'P5', classes: 'bg-rose-100 text-rose-600' },
}

export function PriorityBadge({ priority, size = 'sm' }: Props) {
  if (!priority) return null
  const { label, classes } = CONFIG[priority] ?? CONFIG[3]
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${padding} ${classes}`}>
      {label}
    </span>
  )
}
