import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Task, TaskStatus } from '../types/database'
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { useComments, useAddComment, useActivity } from '../hooks/useComments'
import { PriorityBadge } from './ui/PriorityBadge'
import { useUIStore } from '../store/uiStore'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  taskId: string
  tasks: Task[]
  weddingId: string
}

type DrawerTab = 'details' | 'comments' | 'activity'

// Labels are set dynamically from translations — see STATUS_OPTS() below

const PRIORITY_OPTS = [
  { value: 1, label: 'P1 — Very Low' },
  { value: 2, label: 'P2 — Low' },
  { value: 3, label: 'P3 — Medium' },
  { value: 4, label: 'P4 — High' },
  { value: 5, label: 'P5 — Critical' },
]

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function actionSummary(action: string, oldVal: string | null, newVal: string | null) {
  switch (action) {
    case 'created': return 'created this task'
    case 'status_changed': return `changed status: ${oldVal} → ${newVal}`
    case 'priority_changed': return `changed priority: P${oldVal} → P${newVal}`
    case 'title_changed': return `renamed to "${newVal}"`
    case 'description_changed': return 'updated the description'
    case 'due_date_changed': return `set due date to ${newVal ?? 'none'}`
    default: return action.replace(/_/g, ' ')
  }
}

export function TaskDetailDrawer({ taskId, tasks, weddingId }: Props) {
  const { closeDrawer } = useUIStore()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const qc = useQueryClient()
  const tr = useTranslation()
  const d = tr.drawer

  const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: d.notStarted },
    { value: 'in_progress', label: d.inProgress },
    { value: 'done', label: d.done },
  ]

  // Escape key closes the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeDrawer])

  const task = tasks.find((t) => t.id === taskId)
  const [tab, setTab] = useState<DrawerTab>('details')
  const [localTitle, setLocalTitle] = useState(task?.title ?? '')
  const [localDesc, setLocalDesc] = useState(task?.description ?? '')
  const [newComment, setNewComment] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: comments } = useComments(taskId)
  const { data: activity } = useActivity(taskId)
  const addComment = useAddComment()

  // Keep local fields in sync when task changes
  useEffect(() => {
    if (task) {
      setLocalTitle(task.title)
      setLocalDesc(task.description ?? '')
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  // Realtime subscription for comments
  useEffect(() => {
    const ch = supabase
      .channel(`comments:${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        () => qc.invalidateQueries({ queryKey: ['comments', taskId] })
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [taskId, qc])

  if (!task) return null

  const push = (changes: Partial<Task>) =>
    updateTask.mutate({ id: task.id, wedding_id: weddingId, _prevTask: task, ...changes })

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id, weddingId }, { onSuccess: closeDrawer })
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId) return
    await addComment.mutateAsync({ taskId, text: newComment.trim(), userId: currentUserId })
    setNewComment('')
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-stone-900/25 backdrop-blur-[2px] z-40" onClick={closeDrawer} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-stone-200">
          <div className="flex-1 min-w-0">
            <input
              className="w-full text-lg font-semibold text-stone-800 bg-transparent border border-transparent hover:border-stone-200 focus:border-rose-300 focus:bg-stone-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors outline-none focus:ring-2 focus:ring-rose-200"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => localTitle.trim() && push({ title: localTitle.trim() })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (localTitle.trim()) push({ title: localTitle.trim() })
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <div className="flex items-center gap-2 mt-1.5 ml-1">
              <PriorityBadge priority={task.priority} size="md" />
              <span className="text-xs text-stone-400">
                {d.updated} {new Date(task.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
            {confirmingDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                >
                  {deleteTask.isPending ? '…' : d.confirmDelete ?? 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  {d.cancel ?? 'Cancel'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="p-1.5 text-stone-300 hover:text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                title={d.deleteTask ?? 'Delete task'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={closeDrawer}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 px-4">
          {(['details', 'comments', 'activity'] as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                tab === t ? 'border-rose-400 text-rose-600' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {t === 'details' ? d.details : t === 'comments' ? d.comments : d.activity}
              {t === 'comments' && comments && comments.length > 0 && (
                <span className="ml-1.5 bg-stone-100 text-stone-500 text-xs px-1.5 py-0.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* ── Details ── */}
          {tab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{d.status}</label>
                <div className="flex gap-2">
                  {STATUS_OPTS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => push({ status: opt.value })}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                        task.status === opt.value
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{d.priority}</label>
                <select
                  value={task.priority ?? 3}
                  onChange={(e) => push({ priority: Number(e.target.value) })}
                  className={inputCls}
                >
                  {PRIORITY_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{d.dueDate}</label>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => push({ due_date: e.target.value || null })}
                  className={inputCls}
                />
              </div>

              {/* Cost */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{d.budget}</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{d.estimatedCost}</p>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      defaultValue={task.estimated_cost ?? ''}
                      onBlur={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        push({ estimated_cost: val })
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{d.actualCost}</p>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      defaultValue={task.actual_cost ?? ''}
                      onBlur={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        push({ actual_cost: val })
                      }}
                      className={inputCls}
                    />
                  </div>
                </div>
                {task.estimated_cost != null && task.actual_cost != null && (
                  <p className={`text-xs mt-1.5 font-medium ${task.actual_cost > task.estimated_cost ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {task.actual_cost > task.estimated_cost
                      ? `$${(task.actual_cost - task.estimated_cost).toLocaleString()} ${d.overBudget}`
                      : `$${(task.estimated_cost - task.actual_cost).toLocaleString()} ${d.remaining}`}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{d.notes}</label>
                <textarea
                  rows={4}
                  value={localDesc}
                  onChange={(e) => setLocalDesc(e.target.value)}
                  onBlur={() => push({ description: localDesc || null })}
                  placeholder={d.notesPlaceholder}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Meta */}
              <div className="pt-2 border-t border-stone-100 text-xs text-stone-400 space-y-1">
                <p>{d.created} {new Date(task.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p>{d.lastUpdated} {new Date(task.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          )}

          {/* ── Comments ── */}
          {tab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 p-5 space-y-4">
                {!comments?.length ? (
                  <p className="text-center text-stone-400 text-sm py-10">{d.noComments}</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold flex-shrink-0">
                        {initials(c.author.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-stone-700">{c.author.name ?? 'Unknown'}</span>
                          <span className="text-xs text-stone-400">{relativeTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-stone-600 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submitComment} className="p-4 border-t border-stone-200 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={d.commentPlaceholder}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 text-stone-700 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || addComment.isPending}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-200 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {d.send}
                </button>
              </form>
            </div>
          )}

          {/* ── Activity ── */}
          {tab === 'activity' && (
            <div className="p-5">
              {!activity?.length ? (
                <p className="text-center text-stone-400 text-sm py-10">{d.noActivity}</p>
              ) : (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-semibold flex-shrink-0 mt-0.5">
                        {initials(item.actor.name)}
                      </div>
                      <div>
                        <p className="text-sm text-stone-600">
                          <span className="font-semibold text-stone-700">{item.actor.name ?? 'Someone'}</span>
                          {' '}{actionSummary(item.action, item.old_value, item.new_value)}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">{relativeTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
