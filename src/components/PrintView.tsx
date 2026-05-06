import type { TaskWithSubtasks } from '../types/database'

interface Props {
  categories: TaskWithSubtasks[]
  weddingName: string
  onClose: () => void
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PrintView({ categories, weddingName, onClose }: Props) {
  const allSubtasks = categories.flatMap((c) => c.subtasks ?? [])
  const doneCount = allSubtasks.filter((t) => t.status === 'done').length

  return (
    <>
      {/* Backdrop — hidden when printing */}
      <div
        className="fixed inset-0 bg-stone-900/30 backdrop-blur-[2px] z-40 print:hidden"
        onClick={onClose}
      />

      {/* Floating controls — hidden when printing */}
      <div className="fixed top-4 right-4 z-[60] flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl shadow-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-stone-600 hover:text-stone-800 text-sm font-medium rounded-xl border border-stone-200 shadow transition-colors"
        >
          Close
        </button>
      </div>

      {/* Print content panel */}
      <div
        id="print-content"
        className="fixed inset-0 z-50 bg-white overflow-auto print:static print:overflow-visible"
      >
        <div className="max-w-2xl mx-auto px-8 py-12 print:py-6">
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-stone-200 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wider mb-2">Wedding Planning Checklist</p>
            <h1 className="text-3xl font-serif font-bold text-stone-900">{weddingName}</h1>
            <p className="text-sm text-stone-500 mt-3">
              {doneCount} of {allSubtasks.length} tasks complete
              {' · '}Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-8">
            {categories.map((cat) => {
              const subs = cat.subtasks ?? []
              const done = subs.filter((t) => t.status === 'done').length
              const allDone = subs.length > 0 && done === subs.length

              return (
                <div key={cat.id} className="break-inside-avoid-page">
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center flex-shrink-0 ${
                          allDone ? 'bg-emerald-500 border-emerald-500' : 'border-stone-400'
                        }`}
                      >
                        {allDone && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <h2 className="text-base font-bold text-stone-800">{cat.title}</h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      {cat.due_date && <span>Due: {fmt(cat.due_date)}</span>}
                      <span>{done}/{subs.length}</span>
                    </div>
                  </div>

                  {/* Subtasks */}
                  {subs.length === 0 ? (
                    <p className="text-sm text-stone-400 italic ml-7">No tasks in this category</p>
                  ) : (
                    <div className="space-y-2 ml-2">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 inline-flex items-center justify-center ${
                              sub.status === 'done'
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-stone-400'
                            }`}
                          >
                            {sub.status === 'done' && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <div className="flex-1 flex items-baseline justify-between gap-3">
                            <span
                              className={`text-sm leading-snug ${
                                sub.status === 'done'
                                  ? 'line-through text-stone-400'
                                  : 'text-stone-700'
                              }`}
                            >
                              {sub.title}
                            </span>
                            {sub.due_date && (
                              <span className="text-xs text-stone-400 flex-shrink-0 whitespace-nowrap">
                                {fmt(sub.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
            <p>💍 Created with Wedding Planner</p>
          </div>
        </div>
      </div>
    </>
  )
}
