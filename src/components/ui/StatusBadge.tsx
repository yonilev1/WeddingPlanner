import type { TaskStatus } from '../../types/database'

interface Props {
  status: TaskStatus
}

const CONFIG: Record<TaskStatus, { label: string; dot: string; classes: string }> = {
  todo:        { label: 'Not Started', dot: 'bg-stone-400',   classes: 'bg-stone-100 text-stone-500' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500',    classes: 'bg-blue-100 text-blue-600' },
  done:        { label: 'Done',         dot: 'bg-emerald-500', classes: 'bg-emerald-100 text-emerald-700' },
}

export function StatusBadge({ status }: Props) {
  const { label, dot, classes } = CONFIG[status] ?? CONFIG.todo
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  )
}
