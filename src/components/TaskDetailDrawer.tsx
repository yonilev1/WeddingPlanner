import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Task, TaskStatus } from '../types/database'
import { useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { useComments, useAddComment, useActivity } from '../hooks/useComments'
import { useCollaborators } from '../hooks/useCollaborators'
import { PriorityBadge } from './ui/PriorityBadge'
import { useUIStore } from '../store/uiStore'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'

const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', he: 'he-IL' }

interface Props {
  taskId: string
  tasks: Task[]
  weddingId: string
}

type DrawerTab = 'details' | 'comments' | 'activity'

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
  fontFamily: 'var(--font-mono, monospace)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 10,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  outline: 'none', transition: 'border-color 120ms', boxSizing: 'border-box',
}

export function TaskDetailDrawer({ taskId, tasks, weddingId }: Props) {
  const { closeDrawer, language } = useUIStore()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const qc = useQueryClient()
  const tr = useTranslation()
  const d = tr.drawer
  const locale = LOCALE_MAP[language] ?? 'en-US'

  const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: d.notStarted },
    { value: 'in_progress', label: d.inProgress },
    { value: 'done', label: d.done },
  ]

  const PRIORITY_OPTS = [
    { value: 1, label: d.p1Label },
    { value: 2, label: d.p2Label },
    { value: 3, label: d.p3Label },
    { value: 4, label: d.p4Label },
    { value: 5, label: d.p5Label },
  ]

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60_000)
    const h = Math.floor(m / 60)
    const dy = Math.floor(h / 24)
    if (dy > 0) return `${dy}${d.timeAgoDays}`
    if (h > 0) return `${h}${d.timeAgoHours}`
    if (m > 0) return `${m}${d.timeAgoMinutes}`
    return d.timeAgoJustNow
  }

  const actionSummary = (action: string, oldVal: string | null, newVal: string | null) => {
    switch (action) {
      case 'created': return d.actCreated
      case 'status_changed': return `${d.actStatusChanged}: ${oldVal} → ${newVal}`
      case 'priority_changed': return `${d.actPriorityChanged}: P${oldVal} → P${newVal}`
      case 'title_changed': return `${d.actRenamed} "${newVal}"`
      case 'description_changed': return d.actUpdatedDesc
      case 'due_date_changed': return `${d.actSetDueDate} ${newVal ?? d.actNoDate}`
      default: return action.replace(/_/g, ' ')
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeDrawer])

  const task = tasks.find((t) => t.id === taskId)
  const [tab, setTab] = useState<DrawerTab>('details')
  const [localTitle, setLocalTitle] = useState(task?.title ?? '')
  const [localDesc, setLocalDesc] = useState(task?.description ?? '')
  const [localEstimated, setLocalEstimated] = useState<string>(task?.estimated_cost != null ? String(task.estimated_cost) : '')
  const [localActual, setLocalActual] = useState<string>(task?.actual_cost != null ? String(task.actual_cost) : '')
  const [newComment, setNewComment] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const { data: comments } = useComments(taskId)
  const { data: activity } = useActivity(taskId)
  const { data: collaborators = [] } = useCollaborators(weddingId)
  const addComment = useAddComment()

  useEffect(() => {
    if (task) {
      setLocalTitle(task.title)
      setLocalDesc(task.description ?? '')
      setLocalEstimated(task.estimated_cost != null ? String(task.estimated_cost) : '')
      setLocalActual(task.actual_cost != null ? String(task.actual_cost) : '')
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

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

  const mentionOptions = mentionQuery !== null
    ? collaborators.filter(c => c.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : []

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNewComment(val)
    const cursor = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/@([\w ]*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionAnchor({ start: cursor - match[0].length, end: cursor })
    } else {
      setMentionQuery(null)
      setMentionAnchor(null)
    }
  }

  function insertMention(name: string) {
    if (!mentionAnchor) return
    const before = newComment.slice(0, mentionAnchor.start)
    const after = newComment.slice(mentionAnchor.end)
    const next = `${before}@${name} ${after}`
    setNewComment(next)
    setMentionQuery(null)
    setMentionAnchor(null)
    setTimeout(() => {
      commentRef.current?.focus()
      const pos = mentionAnchor.start + name.length + 2
      commentRef.current?.setSelectionRange(pos, pos)
    }, 0)
  }

  function renderCommentText(text: string) {
    return text.split(/(@\S+)/g).map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{part}</span>
        : part
    )
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newComment.trim()
    if (!text || !currentUserId) return

    // Resolve @Name mentions to user IDs — match each collaborator's exact name
    const mentionedUserIds = collaborators
      .filter(c => c.name && text.includes(`@${c.name}`))
      .map(c => c.id)

    await addComment.mutateAsync({ taskId, text, userId: currentUserId, weddingId, mentionedUserIds })
    setNewComment('')
    setMentionQuery(null)
    setMentionAnchor(null)
  }

  const TAB_LABELS: Record<DrawerTab, string> = {
    details: d.details,
    comments: d.comments,
    activity: d.activity,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(2px)', zIndex: 40 }}
        onClick={closeDrawer}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100%', width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', zIndex: 50,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 200ms cubic-bezier(0.2,0.8,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 20px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              style={{
                width: '100%', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
                background: 'transparent', border: '1px solid transparent',
                borderRadius: 8, padding: '4px 8px', margin: '-4px -8px',
                outline: 'none', transition: 'border-color 120ms, background 120ms',
                boxSizing: 'content-box',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; (e.target as HTMLInputElement).style.background = 'var(--bg-soft)' }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = 'transparent'
                ;(e.target as HTMLInputElement).style.background = 'transparent'
                if (localTitle.trim()) push({ title: localTitle.trim() })
              }}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (localTitle.trim()) push({ title: localTitle.trim() })
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 2 }}>
              <PriorityBadge priority={task.priority} size="md" />
              <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {d.updated} {new Date(task.updated_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2 }}>
            {confirmingDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--bad)', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                >
                  {deleteTask.isPending ? '…' : d.confirmDelete ?? 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                  {d.cancel ?? 'Cancel'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                title={d.deleteTask ?? 'Delete task'}
                style={{ padding: 6, color: 'var(--ink-4)', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'color 120ms' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--bad)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink-4)')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={closeDrawer}
              style={{ padding: 6, color: 'var(--ink-3)', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'color 120ms' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink-3)')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs — underline style */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 20px' }}>
          {(['details', 'comments', 'activity'] as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '11px 16px', fontSize: 13, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent-ink)' : 'var(--ink-3)',
                transition: 'color 120ms, border-color 120ms',
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[t]}
              {t === 'comments' && comments && comments.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--bg-soft)', color: 'var(--ink-4)', fontSize: 11, padding: '1px 6px', borderRadius: 999 }}>
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {/* ── Details ── */}
          {tab === 'details' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Status — segmented control */}
              <div>
                <label style={fieldLabel}>{d.status}</label>
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  {STATUS_OPTS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => push({ status: opt.value })}
                      style={{
                        flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 500,
                        border: 'none', borderInlineStart: i > 0 ? '1px solid var(--line)' : 'none',
                        cursor: 'pointer', transition: 'all 120ms',
                        background: task.status === opt.value ? 'var(--accent-soft)' : 'transparent',
                        color: task.status === opt.value ? 'var(--accent-ink)' : 'var(--ink-3)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label style={fieldLabel}>{d.priority}</label>
                <select
                  value={task.priority ?? 3}
                  onChange={(e) => push({ priority: Number(e.target.value) })}
                  style={inputStyle}
                >
                  {PRIORITY_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label style={fieldLabel}>{d.dueDate}</label>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => push({ due_date: e.target.value || null })}
                  style={inputStyle}
                />
              </div>

              {/* Cost */}
              <div>
                <label style={fieldLabel}>{d.budget}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>{d.estimatedCost}</p>
                    <input
                      type="number" min="0" step="1" placeholder="0"
                      value={localEstimated}
                      onChange={(e) => setLocalEstimated(e.target.value)}
                      onBlur={() => push({ estimated_cost: localEstimated === '' ? null : Number(localEstimated) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>{d.actualCost}</p>
                    <input
                      type="number" min="0" step="1" placeholder="0"
                      value={localActual}
                      onChange={(e) => setLocalActual(e.target.value)}
                      onBlur={() => push({ actual_cost: localActual === '' ? null : Number(localActual) })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                {task.estimated_cost != null && task.actual_cost != null && (
                  <p style={{ fontSize: 12, marginTop: 6, fontWeight: 500, color: task.actual_cost > task.estimated_cost ? 'var(--bad)' : 'var(--ok)' }}>
                    {task.actual_cost > task.estimated_cost
                      ? `$${(task.actual_cost - task.estimated_cost).toLocaleString()} ${d.overBudget}`
                      : `$${(task.estimated_cost - task.actual_cost).toLocaleString()} ${d.remaining}`}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={fieldLabel}>{d.notes}</label>
                <textarea
                  rows={4}
                  value={localDesc}
                  onChange={(e) => setLocalDesc(e.target.value)}
                  onBlur={() => push({ description: localDesc || null })}
                  placeholder={d.notesPlaceholder}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {/* Meta */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 2 }}>
                  {d.created} {new Date(task.created_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  {d.lastUpdated} {new Date(task.updated_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* ── Comments ── */}
          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!comments?.length ? (
                  <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, paddingTop: 40 }}>{d.noComments}</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                        background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {initials(c.author.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.author.name ?? 'Unknown'}</span>
                          <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{relativeTime(c.created_at)}</span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {renderCommentText(c.text)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment input with @mention */}
              <form onSubmit={submitComment} style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
                {/* Mention dropdown */}
                {mentionQuery !== null && mentionOptions.length > 0 && (
                  <div style={{
                    background: 'var(--bg-card)', border: '1px solid var(--line)',
                    borderRadius: 10, marginBottom: 8, overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  }}>
                    {mentionOptions.slice(0, 6).map((collab) => (
                      <button
                        key={collab.id}
                        type="button"
                        onClick={() => insertMention(collab.name ?? '')}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', background: 'none', border: 'none',
                          cursor: 'pointer', textAlign: 'start', transition: 'background 100ms',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                          background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {initials(collab.name)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{collab.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={commentRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setMentionQuery(null); setMentionAnchor(null) }
                      if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
                        e.preventDefault()
                        submitComment(e as unknown as React.FormEvent)
                      }
                    }}
                    placeholder={`${d.commentPlaceholder} — type @ to mention`}
                    rows={2}
                    style={{ ...inputStyle, flex: 1, width: 'auto', resize: 'none', lineHeight: 1.5 }}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || addComment.isPending}
                    style={{ padding: '9px 16px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer', opacity: (!newComment.trim() || addComment.isPending) ? 0.5 : 1, transition: 'opacity 120ms', flexShrink: 0 }}
                  >
                    {d.send}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 5 }}>
                  Type <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>@</span> to mention a collaborator · Enter to send · Shift+Enter for new line
                </p>
              </form>
            </div>
          )}

          {/* ── Activity ── */}
          {tab === 'activity' && (
            <div style={{ padding: 20 }}>
              {!activity?.length ? (
                <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, paddingTop: 40 }}>{d.noActivity}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activity.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                        background: 'var(--bg-soft)', color: 'var(--ink-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, marginTop: 2,
                      }}>
                        {initials(item.actor.name)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.actor.name ?? 'Someone'}</span>
                          {' '}{actionSummary(item.action, item.old_value, item.new_value)}
                        </p>
                        <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{relativeTime(item.created_at)}</p>
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
