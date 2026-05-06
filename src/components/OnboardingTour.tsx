import { useState } from 'react'

const STEPS = [
  {
    emoji: '💍',
    title: 'Welcome to your wedding planner!',
    desc: 'This quick tour covers the 4 main features. You can skip it anytime and restart it from the nav bar.',
  },
  {
    emoji: '🗂️',
    title: 'Categories & Tasks',
    desc: 'The left sidebar lists your planning categories — like Venue, Catering, or Flowers. Click one to view its tasks, or drag to reorder. Press N to quickly add a new task to the selected category.',
  },
  {
    emoji: '🔍',
    title: 'Filters & Search',
    desc: 'Use the search bar to find tasks by name or description. Filter by status, priority, or due date range. Press / to focus the search from anywhere.',
  },
  {
    emoji: '📅',
    title: 'Calendar View',
    desc: 'Toggle to calendar view using the icons in the top right of the task board. See all tasks with due dates plotted on a 3-month calendar, color-coded by priority.',
  },
  {
    emoji: '👥',
    title: 'Collaborate & Track Budget',
    desc: 'Invite your partner using the 👥 button in the top bar — share the code or copy a link. Track costs per task with the 💰 budget panel. Both open from the nav.',
  },
]

interface Props {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => (isLast ? onComplete() : setStep((s) => s + 1))
  const prev = () => setStep((s) => s - 1)

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 bg-stone-900/50 z-[80] pointer-events-none" />

      {/* Tour card */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 dark:border-stone-700">
          {/* Step indicator dots */}
          <div className="flex gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? 'w-6 bg-rose-500' : 'w-1.5 bg-stone-200 dark:bg-stone-600 hover:bg-stone-300'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-4xl mb-3">{current.emoji}</div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-lg mb-2 leading-snug">
            {current.title}
          </h3>
          <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
            {current.desc}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={onComplete}
                className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                Skip tour
              </button>
              {step > 0 && (
                <button
                  onClick={prev}
                  className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>
            <button
              onClick={next}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {isLast ? 'Get started! 🎉' : 'Next →'}
            </button>
          </div>

          {/* Step count */}
          <p className="text-xs text-stone-300 dark:text-stone-600 text-center mt-4">
            {step + 1} of {STEPS.length}
          </p>
        </div>
      </div>
    </>
  )
}
