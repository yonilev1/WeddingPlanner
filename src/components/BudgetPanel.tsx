import type { TaskWithSubtasks, Vendor } from '../types/database'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  categories: TaskWithSubtasks[]
  vendors?: Vendor[]
  onClose: () => void
  asPage?: boolean
}

const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', he: 'he-IL' }

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, border: '1px solid var(--line)', flexShrink: 0 }} />
      {label}
    </span>
  )
}

export function BudgetPanel({ categories, vendors = [], onClose, asPage }: Props) {
  const { openDrawer, language } = useUIStore()
  const tr = useTranslation()
  const b = tr.budget
  const locale = LOCALE_MAP[language] ?? 'en-US'
  const fmt = (n: number) =>
    n.toLocaleString(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const catName = (title: string) => (tr.categoryNames as Record<string, string>)[title] ?? title

  const categoryBudgets = categories.map((cat) => {
    const allTasks = [cat, ...(cat.subtasks ?? [])]
    const taskEstimated = allTasks.reduce((sum, t) => sum + (t.estimated_cost ?? 0), 0)
    const taskActual = allTasks.reduce((sum, t) => sum + (t.actual_cost ?? 0), 0)

    // Add vendor costs linked to this category task
    const vendorsForTask = vendors.filter(v => (v as any).task_id === cat.id)
    const vendorEstimated = vendorsForTask.reduce((sum, v) => sum + (v.total_cost ?? 0), 0)
    const vendorActual = vendorsForTask.reduce((sum, v) => sum + (v.deposit_paid ? (v.deposit_amount ?? 0) : 0), 0)

    const estimated = taskEstimated + vendorEstimated
    const actual = taskActual + vendorActual
    return { id: cat.id, title: cat.title, estimated, actual }
  }).filter((c) => c.estimated > 0 || c.actual > 0).sort((a, b) => b.estimated - a.estimated)

  const totalEstimated = categoryBudgets.reduce((s, c) => s + c.estimated, 0)
  const totalActual = categoryBudgets.reduce((s, c) => s + c.actual, 0)
  const remaining = totalEstimated - totalActual
  const overBudget = remaining < 0

  const allTasksWithCost = categories.flatMap((cat) =>
    [...(cat.subtasks ?? [])].filter((t) => (t.estimated_cost ?? 0) > 0)
  ).sort((a, b) => (b.estimated_cost ?? 0) - (a.estimated_cost ?? 0)).slice(0, 8)

  const inner = (
    <div className="dashboard-page" style={{ maxWidth: 1080 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p className="font-display" style={{ fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.1, color: 'var(--ink)' }}>{b.title}</p>
        <p style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>{b.subtitle}</p>
      </div>

      {/* Budget overview: donut ring + tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, marginBottom: 32, alignItems: 'center' }}>
        {/* Donut ring */}
        {totalEstimated > 0 && (() => {
          const pct = Math.min(1, totalActual / totalEstimated)
          const r = 52
          const circ = 2 * Math.PI * r
          const dash = pct * circ
          return (
            <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
                <circle
                  cx="70" cy="70" r={r} fill="none"
                  stroke={overBudget ? 'var(--bad)' : 'var(--accent)'}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-display" style={{ fontSize: 24, color: overBudget ? 'var(--bad)' : 'var(--ink)', lineHeight: 1 }}>
                  {Math.round(pct * 100)}%
                </span>
                <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {b.spent.toLowerCase()}
                </span>
              </div>
            </div>
          )
        })()}

        {/* Summary tiles */}
        <div className="budget-tiles-grid" style={{ margin: 0 }}>
          {[
            { label: b.estimated, value: fmt(totalEstimated), tone: 'neutral' },
            { label: b.spent,     value: fmt(totalActual),    tone: 'neutral' },
            { label: overBudget ? b.over : b.remaining, value: fmt(Math.abs(remaining)), tone: overBudget ? 'bad' : 'ok' },
          ].map((tile, i) => (
            <div key={i} style={{ padding: '20px 20px', background: 'var(--bg-card)' }}>
              <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                {tile.label}
              </p>
              <p className="font-display" style={{
                fontSize: 'clamp(22px, 4vw, 36px)',
                color: tile.tone === 'bad' ? 'var(--bad)' : tile.tone === 'ok' ? 'var(--ok)' : 'var(--ink)',
              }}>{tile.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      {categoryBudgets.length > 0 && (
        <>
          <p className="font-display" style={{ fontSize: 20, marginBottom: 12, color: 'var(--ink)' }}>{b.byCategory}</p>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--line)',
            borderRadius: 12, overflow: 'hidden', marginBottom: 32,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr',
              padding: '10px 20px', borderBottom: '1px solid var(--line)',
            }}>
              <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Category</span>
              <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, textAlign: 'end' }}>{b.estimated}</span>
              <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, textAlign: 'end' }}>{b.spent}</span>
            </div>
            {categoryBudgets.map(({ id, title, estimated, actual }) => {
              const over = actual > estimated && estimated > 0
              return (
                <div key={id} style={{
                  display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr',
                  padding: '14px 20px', borderTop: '1px solid var(--line-soft)',
                  alignItems: 'center',
                }}>
                  <button
                    onClick={() => openDrawer(id)}
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                  >
                    {catName(title)}
                  </button>
                  <span className="font-mono-ui" style={{ textAlign: 'end', fontSize: 13, color: 'var(--ink-2)' }}>{fmt(estimated)}</span>
                  <span className="font-mono-ui" style={{ textAlign: 'end', fontSize: 13, color: over ? 'var(--bad)' : 'var(--ink-2)' }}>{fmt(actual)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Top line items */}
      {allTasksWithCost.length > 0 && (
        <>
          <p className="font-display" style={{ fontSize: 20, marginBottom: 12, color: 'var(--ink)' }}>{b.allLineItems}</p>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--line)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {allTasksWithCost.map((t, i) => (
              <div key={t.id}
                onClick={() => openDrawer(t.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  padding: '12px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  alignItems: 'center', cursor: 'pointer', gap: 12, transition: 'background 120ms',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{t.title}</p>
                <span className="font-mono-ui" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{fmt(t.estimated_cost ?? 0)}</span>
                {t.actual_cost != null ? (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: 'var(--ok-soft)', color: 'var(--ok)',
                    border: '1px solid var(--ok-soft)', whiteSpace: 'nowrap',
                  }}>paid</span>
                ) : (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: 'transparent', color: 'var(--ink-3)',
                    border: '1px solid var(--line)', whiteSpace: 'nowrap',
                  }}>due</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {categoryBudgets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          <p className="font-display" style={{ fontSize: 40, marginBottom: 8 }}>○</p>
          <p style={{ fontSize: 14 }}>{b.noCosts}</p>
          <p style={{ fontSize: 13, marginTop: 4, color: 'var(--ink-4)' }}>{b.noCostsHint}</p>
        </div>
      )}
    </div>
  )

  if (asPage) {
    return <div className="overflow-auto scrollbar-thin" style={{ minHeight: '100%', background: 'var(--bg)' }}>{inner}</div>
  }

  return (
    <>
      <div className="fixed inset-0 z-40 anim-fade-in"
        style={{ background: 'color-mix(in oklch, var(--ink) 20%, transparent)', backdropFilter: 'blur(2px)' }}
        onClick={onClose} />
      <div className="fixed end-0 top-0 h-full w-full max-w-md z-50 overflow-auto scrollbar-thin anim-slide-r"
        style={{ background: 'var(--bg-card)', borderInlineStart: '1px solid var(--line)', boxShadow: '-12px 0 32px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="font-display" style={{ fontSize: 22, color: 'var(--ink)' }}>{b.title}</p>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', borderRadius: 6 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {inner}
        </div>
      </div>
    </>
  )
}
