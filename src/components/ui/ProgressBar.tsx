interface Props {
  value: number
  className?: string
  size?: 'sm' | 'md'
  color?: string
}

export function ProgressBar({ value, className = '', size = 'sm', color = 'bg-rose-400' }: Props) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`w-full bg-stone-200 rounded-full overflow-hidden ${h} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
