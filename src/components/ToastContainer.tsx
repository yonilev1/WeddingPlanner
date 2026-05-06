import { useToastStore } from '../hooks/useToast'

const ICONS: Record<string, string> = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
}

const COLORS: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-stone-800 text-white',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto max-w-xs animate-in slide-in-from-bottom-2 ${COLORS[t.kind]}`}
        >
          <span className="text-base leading-none flex-shrink-0">{ICONS[t.kind]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none ml-1 flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
