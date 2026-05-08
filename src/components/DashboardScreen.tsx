import { useMemo } from 'react'
import type { Wedding, Profile } from '../types/database'
import { useTaskTree } from '../hooks/useTasks'
import { useCollaborators } from '../hooks/useCollaborators'
import { ProgressBar } from './ui/ProgressBar'
import { PriorityBadge } from './ui/PriorityBadge'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'

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

  const { categories, isPending } = useTaskTree(wedding.id)
  const { data: collaborators = [] } = useCollaborators(wedding.id)
  const { setActiveMainTab, openDrawer, language } = useUIStore()
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
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
                <p className="font-display" style={{ fontSize: 32, marginBottom: 8 }}>○</p>
                <p style={{ fontSize: 14 }}>{d.noUrgent}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>{d.noUrgentHint}</p>
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
                      {task.title}
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
              {categories
                .flatMap((c) => (c.subtasks ?? []).map((t) => ({ ...t, _cat: c })))
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .filter((t) => t.status !== 'done')
                .slice(0, 5)
                .map((task, i) => {
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
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          {(tr.categoryNames as Record<string, string>)[task._cat.title] ?? task._cat.title}
                        </p>
                        <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{relTime}</span>
                      </div>
                    </div>
                  )
                })}
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
