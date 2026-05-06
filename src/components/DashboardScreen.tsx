import { useMemo } from 'react'
import type { Wedding, Profile } from '../types/database'
import { useTaskTree } from '../hooks/useTasks'
import { ProgressBar } from './ui/ProgressBar'
import { PriorityBadge } from './ui/PriorityBadge'
import { StatusBadge } from './ui/StatusBadge'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  wedding: Wedding
  profile: Profile
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(d) < today
}

export function DashboardScreen({ wedding, profile }: Props) {
  const tr = useTranslation()
  const d = tr.dashboard

  const { categories, isPending } = useTaskTree(wedding.id)
  const { setActiveMainTab } = useUIStore()

  const stats = useMemo(() => {
    const allSubs = categories.flatMap((c) => c.subtasks ?? [])
    const done = allSubs.filter((t) => t.status === 'done').length
    const total = allSubs.length
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [categories])

  const daysUntil = useMemo(() => {
    if (!wedding.date) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(wedding.date).getTime() - today.getTime()) / 86_400_000)
  }, [wedding.date])

  const urgentTasks = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30)
    return categories
      .flatMap((c) => c.subtasks ?? [])
      .filter((t) => {
        if (t.status === 'done') return false
        if ((t.priority ?? 0) < 4) return false
        if (!t.due_date) return false
        return new Date(t.due_date) <= cutoff
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 8)
  }, [categories])

  const completedCategories = categories.filter((c) => {
    const subs = c.subtasks ?? []
    return subs.length > 0 && subs.every((t) => t.status === 'done')
  }).length

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold text-stone-800">{wedding.name}</h1>
        <p className="text-stone-500 mt-1">
          {d.welcomeBack}{profile.name ? `, ${profile.name}` : ''}! {d.planningOverview}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Countdown */}
        <div className="bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl p-6 text-white">
          {daysUntil !== null ? (
            <>
              <p className="text-rose-100 text-sm font-medium mb-1">{d.daysUntil}</p>
              <p className="text-5xl font-bold leading-none">{Math.max(0, daysUntil)}</p>
              <p className="text-rose-100 text-sm mt-2">
                {daysUntil > 0
                  ? new Date(wedding.date!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : daysUntil === 0
                  ? d.today
                  : d.congrats}
              </p>
            </>
          ) : (
            <>
              <p className="text-rose-100 text-sm font-medium mb-1">{d.weddingDate}</p>
              <p className="text-xl font-semibold mt-2">{d.notSet}</p>
              <p className="text-rose-100 text-xs mt-1.5">{d.setDateHint}</p>
            </>
          )}
        </div>

        {/* Overall progress */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200">
          <p className="text-stone-500 text-sm font-medium mb-1">{d.overallProgress}</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-stone-800 leading-none">{stats.percent}%</p>
            <p className="text-stone-400 text-sm pb-0.5">{stats.done}/{stats.total} {d.tasks}</p>
          </div>
          <ProgressBar value={stats.percent} size="md" className="mt-3" />
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200">
          <p className="text-stone-500 text-sm font-medium mb-1">{d.categoryProgress}</p>
          <p className="text-4xl font-bold text-stone-800 leading-none">{categories.length}</p>
          <p className="text-stone-400 text-sm mt-2">{completedCategories} {d.complete}</p>
        </div>
      </div>

      {/* Urgent tasks */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-800">{d.urgentTasks}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{d.urgentTasksSubtitle}</p>
          </div>
          <button
            onClick={() => setActiveMainTab('board')}
            className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
          >
            {d.viewAll} →
          </button>
        </div>

        {isPending ? (
          <div className="py-12 text-center text-stone-400 text-sm">{tr.common.loading}</div>
        ) : urgentTasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-stone-500 text-sm">{d.noUrgent}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {urgentTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveMainTab('board')}
                className="px-6 py-3.5 flex items-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isOverdue(task.due_date)
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {isOverdue(task.due_date) ? `${d.overdue} · ` : ''}{formatDate(task.due_date)}
                    </span>
                  )}
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
