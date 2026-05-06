import type { TaskWithSubtasks } from '../types/database'
import { useUIStore } from '../store/uiStore'

interface Props {
  categories: TaskWithSubtasks[]
  onClose: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function BudgetPanel({ categories, onClose }: Props) {
  const { openDrawer } = useUIStore()

  type CategoryBudget = {
    id: string
    title: string
    estimated: number
    actual: number
    count: number
  }

  const categoryBudgets: CategoryBudget[] = categories.map((cat) => {
    const allTasks = [cat, ...(cat.subtasks ?? [])]
    const estimated = allTasks.reduce((sum, t) => sum + (t.estimated_cost ?? 0), 0)
    const actual = allTasks.reduce((sum, t) => sum + (t.actual_cost ?? 0), 0)
    const count = allTasks.filter((t) => t.estimated_cost != null || t.actual_cost != null).length
    return { id: cat.id, title: cat.title, estimated, actual, count }
  }).filter((c) => c.count > 0 || c.estimated > 0 || c.actual > 0)

  const totalEstimated = categoryBudgets.reduce((s, c) => s + c.estimated, 0)
  const totalActual = categoryBudgets.reduce((s, c) => s + c.actual, 0)
  const remaining = totalEstimated - totalActual
  const overBudget = remaining < 0

  // All tasks with any cost data for the task list
  const allTasksWithCost = categories.flatMap((cat) =>
    [cat, ...(cat.subtasks ?? [])].filter((t) => t.estimated_cost != null || t.actual_cost != null)
  )

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/25 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h2 className="font-semibold text-stone-800">Budget Tracker</h2>
            <p className="text-xs text-stone-400 mt-0.5">Estimated vs. actual costs</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Summary cards */}
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-400 mb-1">Estimated</p>
              <p className="text-lg font-bold text-stone-800">{fmt(totalEstimated)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-400 mb-1">Spent</p>
              <p className="text-lg font-bold text-stone-800">{fmt(totalActual)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${overBudget ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <p className={`text-xs mb-1 ${overBudget ? 'text-rose-400' : 'text-emerald-500'}`}>
                {overBudget ? 'Over' : 'Remaining'}
              </p>
              <p className={`text-lg font-bold ${overBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                {fmt(Math.abs(remaining))}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {totalEstimated > 0 && (
            <div className="px-4 pb-4">
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min((totalActual / totalEstimated) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-1 text-right">
                {Math.round((totalActual / totalEstimated) * 100)}% of budget used
              </p>
            </div>
          )}

          {/* By category */}
          {categoryBudgets.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">By Category</p>
              <div className="space-y-2">
                {categoryBudgets.map((cat) => {
                  const pct = cat.estimated > 0 ? Math.min((cat.actual / cat.estimated) * 100, 100) : 0
                  const over = cat.actual > cat.estimated && cat.estimated > 0
                  return (
                    <div key={cat.id} className="bg-stone-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          onClick={() => { openDrawer(cat.id); onClose() }}
                          className="text-sm font-medium text-stone-700 hover:text-rose-600 transition-colors text-left truncate"
                        >
                          {cat.title}
                        </button>
                        <span className={`text-xs font-medium flex-shrink-0 ml-2 ${over ? 'text-rose-500' : 'text-stone-500'}`}>
                          {fmt(cat.actual)} / {fmt(cat.estimated)}
                        </span>
                      </div>
                      {cat.estimated > 0 && (
                        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${over ? 'bg-rose-400' : 'bg-emerald-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All tasks with costs */}
          {allTasksWithCost.length > 0 && (
            <div className="px-4 pb-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">All Line Items</p>
              <div className="space-y-1">
                {allTasksWithCost.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { openDrawer(t.id); onClose() }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors text-left group"
                  >
                    <span className="flex-1 text-sm text-stone-700 truncate group-hover:text-rose-600 transition-colors">
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      {t.estimated_cost != null && (
                        <span className="text-stone-400">{fmt(t.estimated_cost)}</span>
                      )}
                      {t.actual_cost != null && (
                        <span className={`font-medium ${(t.actual_cost ?? 0) > (t.estimated_cost ?? Infinity) ? 'text-rose-500' : 'text-emerald-600'}`}>
                          → {fmt(t.actual_cost)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {allTasksWithCost.length === 0 && (
            <div className="px-4 pb-6 text-center py-12">
              <p className="text-3xl mb-3">💰</p>
              <p className="text-stone-500 text-sm">No costs tracked yet.</p>
              <p className="text-stone-400 text-xs mt-1">
                Open any task and add an estimated or actual cost to track your budget.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
