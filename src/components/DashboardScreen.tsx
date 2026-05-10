import { useMemo } from 'react'
import type { Wedding, Profile } from '../types/database'
import { useTaskTree } from '../hooks/useTasks'
import { useCollaborators } from '../hooks/useCollaborators'
import { useGuests } from '../hooks/useGuests'
import { useVendors } from '../hooks/useVendors'
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

function Chevron() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

function Bar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div style={{ height: 4, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 600ms ease' }} />
    </div>
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
  const { setActiveMainTab, openDrawer, language, gettingStartedCollapsed, setGettingStartedCollapsed, setGuestFormOpen } = useUIStore()
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

  // Parse couple names from "Name & Name" or similar formats
  const weddingTitle = wedding.name.replace(/\s*'?s?\s+[Ww]edding\s*$/i, '')
  const ampMatch = weddingTitle.match(/^(.*?)\s*[&]\s*(.+)$/)
  const nameA = ampMatch ? ampMatch[1].trim() : weddingTitle
  const nameB = ampMatch ? ampMatch[2].trim() : null

  const gettingStartedSteps = useMemo(() => [
    {
      id: 'date',
      label: 'Set your wedding date',
      done: !!wedding.date,
      action: () => {/* settings panel */},
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
      hint: 'You have pre-loaded tasks. Mark your first one done.',
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

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="font-mono-ui" style={{
          fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 10,
        }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="font-display" style={{
          fontSize: 'clamp(32px, 5.5vw, 62px)',
          lineHeight: 1.05, color: 'var(--ink)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px',
        }}>
          <span>{nameA}</span>
          {nameB && <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>&amp;</span>}
          {nameB && <span>{nameB}</span>}
        </h1>

        {/* Ruled date separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
            {wedding.date
              ? new Date(wedding.date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
              : 'NO DATE SET'}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
      </div>

      {/* ── Getting started ───────────────────────────────────────────────────── */}
      {gsAllDone && (
        <div style={{
          marginBottom: 28, padding: '20px 24px',
          background: 'var(--accent-soft)',
          border: '1px solid',
          borderColor: 'oklch(0.88 0.04 35)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>💍</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
              You're all set up — now the real planning begins!
            </p>
            <p style={{ fontSize: 13, color: 'var(--accent-ink)', lineHeight: 1.5, opacity: 0.8 }}>
              All the essentials are in place. Keep going — every task you check off brings you closer to the perfect day.
            </p>
          </div>
          <button
            onClick={() => setActiveMainTab('board' as any)}
            style={{ flexShrink: 0, padding: '9px 18px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Keep going →</button>
        </div>
      )}

      {!gsAllDone && (
        gettingStartedCollapsed ? (
          <button
            onClick={() => setGettingStartedCollapsed(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              padding: '8px 14px', background: 'var(--bg-card)',
              border: '1px solid var(--line)', borderRadius: 999, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
            }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {gettingStartedSteps.map(s => (
                <div key={s.id} style={{ width: 14, height: 4, borderRadius: 999, background: s.done ? 'var(--accent)' : 'var(--line)' }} />
              ))}
            </div>
            Getting started · {gsDone}/{gettingStartedSteps.length}
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
        ) : (
          <div style={{ marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--accent-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Getting started</p>
                  <p style={{ fontSize: 12, color: 'var(--accent-ink)', opacity: 0.75 }}>{gsDone} of {gettingStartedSteps.length} steps complete</p>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {gettingStartedSteps.map(s => (
                    <div key={s.id} style={{ width: 20, height: 4, borderRadius: 999, background: s.done ? 'var(--accent)' : 'var(--line)', transition: 'background 300ms' }} />
                  ))}
                </div>
              </div>
              <button onClick={() => setGettingStartedCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div>
              {gettingStartedSteps.map((step, i) => (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  opacity: step.done ? 0.5 : 1, transition: 'opacity 200ms',
                }}>
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 999,
                    border: `2px solid ${step.done ? 'var(--ok)' : 'var(--line)'}`,
                    background: step.done ? 'var(--ok)' : 'transparent',
                    display: 'grid', placeItems: 'center', transition: 'all 200ms',
                  }}>
                    {step.done && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textDecoration: step.done ? 'line-through' : 'none', marginBottom: 1 }}>{step.label}</p>
                    {!step.done && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{step.hint}</p>}
                  </div>
                  {!step.done && (
                    <button onClick={step.action} style={{ flexShrink: 0, padding: '6px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {step.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Stat tiles ───────────────────────────────────────────────────────── */}
      <div className="stat-tiles-grid" style={{ marginBottom: 24 }}>
        {/* Countdown hero cell */}
        <div style={{
          padding: '24px 22px', background: 'var(--accent-soft)',
          position: 'relative', overflow: 'hidden',
          minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {daysUntil !== null && (
            <span aria-hidden style={{
              position: 'absolute', right: -10, bottom: -18,
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(90px, 13vw, 160px)',
              fontStyle: 'italic', opacity: 0.08, lineHeight: 1,
              color: 'var(--accent)', userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.03em',
            }}>{daysUntil}</span>
          )}
          <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Days until
          </p>
          <div>
            {daysUntil !== null ? (
              <>
                <p className="font-display" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: 1, fontStyle: 'italic', color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
                  {daysUntil}
                </p>
                <p style={{ fontSize: 11, color: 'var(--accent-ink)', opacity: 0.7 }}>
                  {new Date(wedding.date!).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 16, color: 'var(--accent-ink)' }}>Not set</p>
            )}
          </div>
        </div>

        {/* Progress */}
        <StatTile label="Progress" value={`${stats.percent}`} unit="%" sub={`${stats.done} of ${stats.total} tasks`} progress={stats.percent} />
        {/* Categories */}
        <StatTile label="Categories" value={`${completedCategories}`} unit={`/ ${categories.length}`} sub={`${inProgressCategories} in progress`} progress={Math.round(100 * completedCategories / Math.max(1, categories.length))} color="var(--ok)" />
        {/* Budget */}
        <StatTile label="Budget" value={`$${(stats.estimatedBudget / 1000).toFixed(0)}k`} unit="" sub={wedding.budget_total ? `${stats.budgetPercent}% of $${(wedding.budget_total / 1000).toFixed(0)}k` : 'Set total in Settings'} progress={Math.min(100, stats.budgetPercent)} color={stats.budgetPercent > 90 ? 'var(--bad)' : 'var(--warn)'} />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Quick actions
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { l: '+ Add task',    bg: 'var(--accent-soft)',  c: 'var(--accent-ink)', fn: () => setActiveMainTab('board' as any) },
            { l: '+ Add guest',   bg: 'var(--ok-soft)',      c: 'var(--ok-ink)',     fn: () => { setActiveMainTab('guests' as any); setGuestFormOpen(true) } },
            { l: 'View all tasks',bg: 'var(--bg-soft)',      c: 'var(--ink-2)',      fn: () => setActiveMainTab('board' as any) },
            { l: 'Track budget',  bg: 'var(--bg-soft)',      c: 'var(--ink-2)',      fn: () => setActiveMainTab('budget' as any) },
          ].map(({ l, bg, c, fn }) => (
            <button key={l} onClick={fn} style={{
              padding: '8px 16px', borderRadius: 999,
              background: bg, color: c, border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'opacity 120ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ── Two-column ────────────────────────────────────────────────────────── */}
      <div className="dashboard-two-col">

        {/* Upcoming tasks */}
        <section>
          <SectionHeader title={d.urgentTasks ?? 'Upcoming tasks'} cta={d.viewAll} onCta={() => setActiveMainTab('board' as any)} />
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {isPending ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>{tr.common.loading}</div>
            ) : urgentTasks.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                {stats.total === 0 ? (
                  <>
                    <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--bg-soft)', margin: '0 auto 14px', display: 'grid', placeItems: 'center' }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth={1.5} strokeLinecap="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>No tasks yet</p>
                    <button onClick={() => setActiveMainTab('board' as any)} style={{ marginTop: 10, padding: '8px 18px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Go to Tasks →</button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--ok-soft)', margin: '0 auto 14px', display: 'grid', placeItems: 'center' }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ok-ink)" strokeWidth={2} strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{d.noUrgent}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>{d.noUrgentHint}</p>
                  </>
                )}
              </div>
            ) : urgentTasks.map((task, i) => {
              const overdue = task.due_date && isOverdue(task.due_date)
              return (
                <div key={task.id} onClick={() => openDrawer(task.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  cursor: 'pointer', transition: 'background 120ms',
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  {/* Priority dot */}
                  <span style={{
                    width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                    background: overdue ? 'var(--bad)' : (task.priority ?? 0) >= 5 ? 'var(--bad)' : (task.priority ?? 0) >= 4 ? 'var(--accent)' : 'var(--warn)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: overdue ? 'var(--ink)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                      {taskName(task.title)}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                      {(tr.categoryNames as Record<string, string>)[task._category.title] ?? task._category.title}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {task.due_date && (
                      <span className="font-mono-ui" style={{ fontSize: 11, color: overdue ? 'var(--bad)' : 'var(--ink-4)' }}>
                        {fmtDate(task.due_date, locale)}
                      </span>
                    )}
                    <span style={{ color: 'var(--ink-4)' }}><Chevron /></span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right column */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Team */}
          <section>
            <SectionHeader title="Your team" />
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
              {collaborators.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No team members yet</p>
                  <button onClick={() => setActiveMainTab('people' as any)} style={{ padding: '7px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Invite partner →</button>
                </div>
              ) : collaborators.slice(0, 5).map((person, i) => {
                const hue = (person.id.charCodeAt(0) * 67) % 360
                return (
                  <div key={person.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                      background: `oklch(0.9 0.06 ${hue})`, color: `oklch(0.38 0.1 ${hue})`,
                      display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
                    }}>
                      {(person.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{person.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{person.role ?? 'Member'}</p>
                    </div>
                    {person.role === 'admin' && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>Admin</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <SectionHeader title="Recent activity" />
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
              {(() => {
                const recentTasks = categories
                  .flatMap((c) => (c.subtasks ?? []).map((t) => ({ ...t, _cat: c })))
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .filter((t) => t.status !== 'done')
                  .slice(0, 5)

                if (recentTasks.length === 0) {
                  return (
                    <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No activity yet.</p>
                      <button onClick={() => setActiveMainTab('board' as any)} style={{ padding: '7px 16px', background: 'var(--bg-soft)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Browse tasks →</button>
                    </div>
                  )
                }

                return recentTasks.map((task, i) => {
                  const mins = Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 60000)
                  const rel = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
                  return (
                    <div key={task.id} onClick={() => openDrawer(task.id)} style={{
                      padding: '11px 15px', borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                      cursor: 'pointer', transition: 'background 120ms',
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {taskName(task.title)}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{(tr.categoryNames as Record<string, string>)[task._cat.title] ?? task._cat.title}</p>
                        <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{rel}</span>
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

// ── Sub-components ──────────────────────────────────────────────────────────────

function StatTile({ label, value, unit, sub, progress, color = 'var(--accent)' }: {
  label: string; value: string; unit: string; sub: string; progress: number; color?: string; last?: boolean
}) {
  return (
    <div style={{ padding: '22px 18px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 9 }}>
          <span className="font-display" style={{ fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1, color: 'var(--ink)' }}>{value}</span>
          {unit && <span style={{ fontSize: 15, color: 'var(--ink-3)' }}>{unit}</span>}
        </div>
        <Bar value={progress} color={color} />
        <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>{sub}</p>
      </div>
    </div>
  )
}

function SectionHeader({ title, cta, onCta }: { title: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 className="font-display" style={{ fontSize: 20, color: 'var(--ink)' }}>{title}</h2>
      {cta && onCta && (
        <button onClick={onCta} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-4)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}>
          {cta} <Chevron />
        </button>
      )}
    </div>
  )
}
