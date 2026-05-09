import { useMemo } from 'react'
import type { Wedding, Profile } from '../types/database'
import { useTaskTree } from '../hooks/useTasks'
import { useCollaborators } from '../hooks/useCollaborators'
import { useGuests } from '../hooks/useGuests'
import { useVendors } from '../hooks/useVendors'
import { ProgressBar } from './ui/ProgressBar'
import { PriorityBadge } from './ui/PriorityBadge'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'
import { useTaskName } from '../i18n/useTaskName'

interface Props {
  wedding: Wedding
  profile: Profile
}

function getLocale(lang: string) {
  return ({ en: 'en-US', fr: 'fr-FR', he: 'he-IL' } as Record<string, string>)[lang] ?? 'en-US'
}

function isOverdue(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(d) < today
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

function ChevronRight() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function DashboardScreen({ wedding, profile }: Props) {
  const tr = useTranslation()
  const d = tr.dashboard
  const taskName = useTaskName()

  const { categories, isPending } = useTaskTree(wedding.id)
  const { data: collaborators = [] } = useCollaborators(wedding.id)
  const { data: guests = [] } = useGuests(wedding.id)
  const { data: vendors = [] } = useVendors(wedding.id)
  const { setActiveMainTab, openDrawer, language, gettingStartedCollapsed, setGettingStartedCollapsed } = useUIStore()
  const locale = getLocale(language)

  const stats = useMemo(() => {
    const allSubs = categories.flatMap((c) => c.subtasks ?? [])
    const done = allSubs.filter((t) => t.status === 'done').length
    const total = allSubs.length
    const estimatedBudget = allSubs.reduce((s, t) => s + (t.estimated_cost ?? 0), 0)
    const budgetPercent = wedding.budget_total ? Math.round((estimatedBudget / wedding.budget_total) * 100) : 0
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0, estimatedBudget, budgetPercent }
  }, [categories, wedding.budget_total])

  const daysUntil = useMemo(() => {
    if (!wedding.date) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((new Date(wedding.date).getTime() - today.getTime()) / 86_400_000))
  }, [wedding.date])

  const urgentTasks = useMemo(() => {
    return categories
      .flatMap((c) => (c.subtasks ?? []).map((t) => ({ ...t, _category: c })))
      .filter((t) => {
        if (t.status === 'done') return false
        if (!t.due_date) return false
        const overdue = isOverdue(t.due_date)
        const soonHigh = (t.priority ?? 0) >= 4
        const days = Math.round((new Date(t.due_date).getTime() - Date.now()) / 86_400_000)
        return overdue || (soonHigh && days <= 30)
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 6)
  }, [categories])

  const completedCategories = categories.filter((c) => {
    const subs = c.subtasks ?? []
    return subs.length > 0 && subs.every((t) => t.status === 'done')
  }).length

  const inProgressCategories = categories.filter((c) => {
    const subs = c.subtasks ?? []
    return subs.some((t) => t.status === 'done') && !subs.every((t) => t.status === 'done')
  }).length

  const hr = new Date().getHours()
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.name?.split(' ')[0] ?? ''

  const names = wedding.name.split('&')

  const gettingStartedSteps = useMemo(() => [
    {
      id: 'date',
      label: 'Set your wedding date',
      done: !!wedding.date,
      action: () => {/* settings panel — handled by admin button in nav */},
      actionLabel: 'Go to settings',
      hint: 'Everything else — countdowns, task due dates — depends on this.',
    },
    {
      id: 'partner',
      label: 'Invite your partner or planner',
      done: collaborators.length > 1,
      action: () => setActiveMainTab('people' as any),
      actionLabel: 'Open People',
      hint: 'Share the planning load — your partner can track and update tasks too.',
    },
    {
      id: 'tasks',
      label: 'Review your task checklist',
      done: stats.done > 0,
      action: () => setActiveMainTab('board' as any),
      actionLabel: 'Go to Tasks',
      hint: 'You already have 73 pre-loaded tasks. Mark your first one done.',
    },
    {
      id: 'guests',
      label: 'Add your guest list',
      done: guests.length > 0,
      action: () => setActiveMainTab('guests' as any),
      actionLabel: 'Open Guest List',
      hint: 'Import all guests at once — paste a list and the app does the rest.',
    },
    {
      id: 'vendor',
      label: 'Add your first vendor',
      done: vendors.length > 0,
      action: () => setActiveMainTab('vendors' as any),
      actionLabel: 'Open Vendors',
      hint: 'Log your venue, photographer, caterer — all in one place.',
    },
  ], [wedding.date, collaborators.length, stats.done, guests.length, vendors.length, setActiveMainTab])

  const gsDone = gettingStartedSteps.filter(s => s.done).length
  const gsAllDone = gsDone === gettingStartedSteps.length

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <p className="font-mono-ui" style={{
          fontSize: 11, color: 'var(--ink-3)', marginBottom: 6,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <p className="font-display" style={{ fontSize: 'clamp(28px, 6vw, 56px)', lineHeight: 1.05, color: 'var(--ink)' }}>
          {names[0] ?? wedding.name}
          {names[1] && <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>&amp;</span>}
          {names[1]}
        </p>

        {/* Date separator */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="font-mono-ui" style={{
            fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', letterSpacing: '0.01em'
          }}>
            {wedding.date ? new Date(wedding.date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
      </div>

      {/* Getting started — celebration when all done */}
      {gsAllDone && (
        <div style={{
          marginBottom: 28, padding: '20px 24px',
          background: 'linear-gradient(135deg, oklch(0.97 0.03 30), oklch(0.96 0.04 340))',
          border: '1px solid var(--accent)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>💍</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
              You're all set up — now the real planning begins!
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              All the essentials are in place. Keep going — every task you check off brings you one step closer to the perfect day. ✨
            </p>
          </div>
          <button
            onClick={() => setActiveMainTab('board' as any)}
            style={{
              flexShrink: 0, padding: '9px 18px',
              background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >Keep going →</button>
        </div>
      )}

      {/* Getting started checklist */}
      {!gsAllDone && (
        gettingStartedCollapsed ? (
          /* Collapsed pill — always visible until all done */
          <button
            onClick={() => setGettingStartedCollapsed(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 20, padding: '8px 14px',
              background: 'var(--bg-card)', border: '1px solid var(--line)',
              borderRadius: 999, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
            }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {gettingStartedSteps.map(s => (
                <div key={s.id} style={{
                  width: 14, height: 4, borderRadius: 999,
                  background: s.done ? 'var(--accent)' : 'var(--line)',
                }} />
              ))}
            </div>
            Getting started · {gsDone}/{gettingStartedSteps.length}
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
        ) : (
          /* Expanded card */
          <div style={{
            marginBottom: 28,
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--accent-soft)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Getting started</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{gsDone} of {gettingStartedSteps.length} steps complete</p>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {gettingStartedSteps.map(s => (
                    <div key={s.id} style={{
                      width: 20, height: 4, borderRadius: 999,
                      background: s.done ? 'var(--accent)' : 'var(--line)',
                      transition: 'background 300ms',
                    }} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setGettingStartedCollapsed(true)}
                title="Collapse"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, lineHeight: 1, padding: 4 }}
              >×</button>
            </div>

            {/* Steps */}
            <div>
              {gettingStartedSteps.map((step, i) => (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  opacity: step.done ? 0.55 : 1,
                  transition: 'opacity 200ms',
                }}>
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 999,
                    border: `2px solid ${step.done ? 'var(--ok)' : 'var(--line)'}`,
                    background: step.done ? 'var(--ok)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 200ms',
                  }}>
                    {step.done && (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: step.done ? 'line-through' : 'none', marginBottom: 1 }}>
                      {step.label}
                    </p>
                    {!step.done && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{step.hint}</p>}
                  </div>
                  {!step.done && (
                    <button
                      onClick={step.action}
                      style={{
                        flexShrink: 0, padding: '6px 14px',
                        background: 'var(--accent)', color: 'white',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >{step.actionLabel}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Stat tiles row */}
      <div className="stat-tiles-grid">
        {/* Countdown hero cell */}
        <div style={{ padding: '30px 24px', background: 'var(--accent-soft)', position: 'relative', overflow: 'hidden', minHeight: 168, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Ghost watermark number */}
          {daysUntil !== null && (
            <div aria-hidden style={{
              position: 'absolute', right: -12, bottom: -24,
              fontFamily: 'var(--font-display)', fontSize: 'clamp(100px, 14vw, 190px)',
              fontWeight: 700, fontStyle: 'italic', opacity: 0.08, lineHeight: 1,
              color: 'var(--accent)', userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.02em'
            }}>{daysUntil}</div>
          )}
          <p className="font-mono-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            {d.daysUntil}
          </p>
          {daysUntil !== null ? (
            <>
              <p className="font-display" style={{ fontSize: 'clamp(52px, 6vw, 88px)', color: 'var(--accent)', marginTop: -4, lineHeight: 1, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
                {daysUntil}
              </p>
              <p style={{ fontSize: 12, color: 'var(--accent-ink)', opacity: 0.65, marginTop: 14, letterSpacing: '0.01em' }}>
                {d.daysUntil} · {new Date(wedding.date!).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 18, color: 'var(--accent-ink)', marginTop: 8 }}>{d.notSet}</p>
          )}
        </div>

        {/* Progress tile */}
        <StatTile
          label={d.overallProgress}
          value={`${stats.percent}`}
          unit="%"
          sub={`${stats.done} / ${stats.total} ${d.tasks}`}
          progress={stats.percent}
        />
        {/* Categories tile */}
        <StatTile
          label={d.categoryProgress}
          value={`${completedCategories}`}
          unit={`/ ${categories.length}`}
          sub={`${inProgressCategories} ${tr.board.inProgress.toLowerCase()}`}
          progress={Math.round(100 * completedCategories / Math.max(1, categories.length))}
        />
        {/* Budget tile */}
        <StatTile
          label={d.budget || 'Budget'}
          value={`$${(stats.estimatedBudget / 1000).toFixed(0)}k`}
          unit=""
          sub={`${stats.budgetPercent}% ${d.ofBudget || 'of budget'}`}
          progress={Math.min(100, stats.budgetPercent)}
          last
        />
      </div>

      {/* Two-column below */}
      <div className="dashboard-two-col">

        {/* Upcoming / urgent list */}
        <section>
          <SectionHeader
            title={d.urgentTasks}
            cta={d.viewAll}
            onCta={() => setActiveMainTab('board' as any)}
          />
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--line)', overflow: 'hidden',
          }}>
            {isPending ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                {tr.common.loading}
              </div>
            ) : urgentTasks.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                {stats.total === 0 ? (
                  <>
                    <p style={{ fontSize: 28, marginBottom: 10 }}>📋</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>No tasks yet</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
                      Your task list starts empty. Add your first category and task to get going.
                    </p>
                    <button
                      onClick={() => setActiveMainTab('board' as any)}
                      style={{ padding: '8px 18px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >Go to Tasks →</button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 28, marginBottom: 10 }}>🎉</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{d.noUrgent}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>{d.noUrgentHint}</p>
                  </>
                )}
              </div>
            ) : urgentTasks.map((task, i) => {
              const overdue = task.due_date && isOverdue(task.due_date)
              return (
                <div
                  key={task.id}
                  onClick={() => openDrawer(task.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                    cursor: 'pointer', transition: 'background 120ms',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <div style={{
                    width: 4, flexShrink: 0, alignSelf: 'stretch',
                    background: overdue ? 'var(--bad)' : (task.priority ?? 0) >= 4 ? 'var(--accent)' : 'var(--line)',
                    borderRadius: 999,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {taskName(task.title)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {(tr.categoryNames as Record<string, string>)[task._category.title] ?? task._category.title}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && (
                      <span className="font-mono-ui" style={{
                        fontSize: 12,
                        color: overdue ? 'var(--bad)' : 'var(--ink-3)',
                      }}>
                        {overdue ? `${d.overdue} · ` : ''}{fmtDate(task.due_date, locale)}
                      </span>
                    )}
                    <span style={{ color: 'var(--ink-4)' }}><ChevronRight /></span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right column — team + activity */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Team section */}
          <section>
            <SectionHeader title="Your team" />
            <div style={{
              background: 'var(--bg-card)', borderRadius: 12,
              border: '1px solid var(--line)', overflow: 'hidden',
            }}>
              {collaborators.slice(0, 5).map((person, i) => (
                <div key={person.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: `oklch(0.92 0.05 ${(person.id.charCodeAt(0) * 67) % 360})`,
                    color: `oklch(0.4 0.1 ${(person.id.charCodeAt(0) * 67) % 360})`,
                    display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 600,
                  }}>
                    {(person.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{person.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{person.role ?? 'Member'}</p>
                  </div>
                </div>
              ))}
              {collaborators.length > 5 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-soft)', fontSize: 13, color: 'var(--ink-3)' }}>
                  +{collaborators.length - 5} more
                </div>
              )}
            </div>
          </section>

          {/* Recent activity section */}
          <section>
            <SectionHeader title="Recent activity" />
            <div style={{
              background: 'var(--bg-card)', borderRadius: 12,
              border: '1px solid var(--line)', overflow: 'hidden',
            }}>
              {(() => {
                const recentTasks = categories
                  .flatMap((c) => (c.subtasks ?? []).map((t) => ({ ...t, _cat: c })))
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .filter((t) => t.status !== 'done')
                  .slice(0, 5)

                if (recentTasks.length === 0) {
                  return (
                    <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
                        No activity yet. Start by opening a task and updating its status.
                      </p>
                      <button
                        onClick={() => setActiveMainTab('board' as any)}
                        style={{ padding: '7px 16px', background: 'var(--bg-soft)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >Browse tasks →</button>
                    </div>
                  )
                }

                return recentTasks.map((task, i) => {
                  const mins = Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 60000)
                  const relTime = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
                  return (
                    <div
                      key={task.id}
                      onClick={() => openDrawer(task.id)}
                      style={{
                        padding: '12px 16px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                        cursor: 'pointer', transition: 'background 120ms',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {taskName(task.title)}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          {(tr.categoryNames as Record<string, string>)[task._cat.title] ?? task._cat.title}
                        </p>
                        <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{relTime}</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatTile({ label, value, unit, sub, progress }: {
  label: string; value: string; unit: string; sub: string; progress: number; last?: boolean
}) {
  return (
    <div style={{
      padding: '24px 20px',
      background: 'var(--bg-card)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <p className="font-mono-ui" style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <span className="font-display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="font-display" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'var(--ink-3)' }}>{unit}</span>}
      </div>
      {progress > 0 && <ProgressBar value={progress} size="sm" />}
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>{sub}</p>
    </div>
  )
}

function SectionHeader({ title, cta, onCta }: { title: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 12, paddingInline: 4,
    }}>
      <p className="font-display" style={{ fontSize: 22, color: 'var(--ink)' }}>{title}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
        >
          {cta} <ChevronRight />
        </button>
      )}
    </div>
  )
}
