import { useMemo } from 'react'
import type { Wedding, Profile } from '../types/database'
import { useTaskTree } from '../hooks/useTasks'
import { ProgressBar } from './ui/ProgressBar'
import { PriorityBadge } from './ui/PriorityBadge'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'
import { LANGUAGES } from '../i18n/translations'

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
  const { setActiveMainTab, openDrawer, language } = useUIStore()
  const locale = getLocale(language)

  const stats = useMemo(() => {
    const allSubs = categories.flatMap((c) => c.subtasks ?? [])
    const done = allSubs.filter((t) => t.status === 'done').length
    const total = allSubs.length
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [categories])

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
      <div style={{ marginBottom: 36 }}>
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
      </div>

      {/* Stat tiles row */}
      <div className="stat-tiles-grid">
        {/* Countdown hero cell */}
        <div style={{ padding: '24px 20px', background: 'var(--bg-card)' }}>
          <p className="font-mono-ui" style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            {d.daysUntil}
          </p>
          {daysUntil !== null ? (
            <>
              <p className="font-display" style={{ fontSize: 'clamp(40px, 7vw, 92px)', color: 'var(--ink)', marginTop: -4, lineHeight: 1 }}>
                {daysUntil}
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                {daysUntil === 0 ? d.today : new Date(wedding.date!).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 18, color: 'var(--ink-3)', marginTop: 8 }}>{d.notSet}</p>
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
        {/* Tasks tile */}
        <StatTile
          label={d.urgentTasks}
          value={`${urgentTasks.length}`}
          unit=""
          sub={urgentTasks.length === 0 ? d.noUrgent : `${urgentTasks.filter(t => isOverdue(t.due_date!)).length} ${d.overdue}`}
          progress={0}
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

        {/* Right column — category progress */}
        <aside>
          <SectionHeader title={d.categoryProgress} />
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--line)', overflow: 'hidden',
          }}>
            {categories.slice(0, 7).map((cat, i) => {
              const subs = cat.subtasks ?? []
              const done = subs.filter((t) => t.status === 'done').length
              const total = subs.length
              const pct = total ? Math.round(100 * done / total) : 0
              return (
                <div key={cat.id} style={{
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                    <button
                      onClick={() => { setActiveMainTab('board' as any) }}
                      style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                    >
                      {(tr.categoryNames as Record<string, string>)[cat.title] ?? cat.title}
                    </button>
                    <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0, marginInlineStart: 8 }}>{done}/{total}</span>
                  </div>
                  <ProgressBar value={pct} size="sm" />
                </div>
              )
            })}
            {categories.length > 7 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-soft)' }}>
                <button
                  onClick={() => setActiveMainTab('board' as any)}
                  style={{ fontSize: 13, color: 'var(--ink-3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  +{categories.length - 7} more →
                </button>
              </div>
            )}
          </div>
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
