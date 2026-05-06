import { useMemo } from 'react'
import type { TaskWithSubtasks } from '../types/database'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'

const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', he: 'he-IL' }

interface Props {
  categories: TaskWithSubtasks[]
}

const PRIORITY_COLORS: Record<number, { bg: string; text: string; dot: string; label: string }> = {
  5: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Critical' },
  4: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400', label: 'High' },
  3: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Medium' },
  2: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Low' },
  1: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400', label: 'Very Low' },
}

function priorityStyle(p: number | null) {
  return PRIORITY_COLORS[p ?? 3] ?? PRIORITY_COLORS[3]
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1)
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function HeatmapView({ categories }: Props) {
  const { openDrawer, language } = useUIStore()
  const tr = useTranslation()
  const h = tr.heatmap
  const locale = LOCALE_MAP[language] ?? 'en-US'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build a map of date-string → tasks due that day
  const allTasks = useMemo(() => {
    const tasks: Array<{ id: string; title: string; priority: number | null; status: string; dateStr: string }> = []
    for (const cat of categories) {
      for (const sub of cat.subtasks ?? []) {
        if (sub.due_date) {
          tasks.push({ id: sub.id, title: sub.title, priority: sub.priority, status: sub.status, dateStr: sub.due_date })
        }
      }
      if (cat.due_date) {
        tasks.push({ id: cat.id, title: cat.title, priority: cat.priority, status: cat.status, dateStr: cat.due_date })
      }
    }
    return tasks
  }, [categories])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof allTasks>()
    for (const t of allTasks) {
      const key = t.dateStr
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [allTasks])

  // 3 months starting from current
  const months = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-5xl mx-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{h.priority}</span>
        {[5, 4, 3, 2, 1].map((p) => {
          const s = priorityStyle(p)
          const label = [tr.drawer.p5Label, tr.drawer.p4Label, tr.drawer.p3Label, tr.drawer.p2Label, tr.drawer.p1Label][5 - p]
          return (
            <div key={p} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          )
        })}
      </div>

      {/* Calendar months */}
      {months.map(({ year, month }) => {
        const monthName = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
        const firstDow = startOfMonth(year, month).getDay()
        const numDays = daysInMonth(year, month)

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-base font-semibold text-stone-700 mb-3">{monthName}</h3>
            <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-stone-100 dark:border-stone-700">
                {weekdays.map((w) => (
                  <div key={w} className="py-2 text-center text-xs font-semibold text-stone-400 dark:text-stone-500">
                    {w}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {/* Leading empty cells */}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[72px] border-r border-b border-stone-50 dark:border-stone-700" />
                ))}

                {Array.from({ length: numDays }).map((_, i) => {
                  const day = i + 1
                  const cellDate = new Date(year, month, day)
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const tasks = tasksByDate.get(dateStr) ?? []
                  const isToday = isSameDay(cellDate, today)
                  const isPast = cellDate < today && !isToday

                  return (
                    <div
                      key={day}
                      className={`min-h-[72px] p-1.5 border-r border-b border-stone-50 dark:border-stone-700 ${isPast ? 'bg-stone-50/50 dark:bg-stone-900/30' : ''}`}
                    >
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-rose-500 text-white'
                          : isPast
                          ? 'text-stone-300 dark:text-stone-600'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {tasks.slice(0, 3).map((t) => {
                          const s = priorityStyle(t.priority)
                          return (
                            <button
                              key={t.id}
                              onClick={() => openDrawer(t.id)}
                              title={t.title}
                              className={`w-full text-left px-1 py-0.5 rounded text-xs truncate leading-tight transition-opacity ${s.bg} ${s.text} ${t.status === 'done' ? 'opacity-40 line-through' : 'hover:opacity-80'}`}
                            >
                              {t.title}
                            </button>
                          )
                        })}
                        {tasks.length > 3 && (
                          <p className="text-xs text-stone-400 px-1">+{tasks.length - 3} {h.more}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {allTasks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-stone-500 text-sm">{h.noDates}</p>
          <p className="text-stone-400 text-xs mt-1">{h.noDatesHint}</p>
        </div>
      )}
    </div>
  )
}
