import { useState } from 'react'
import type { Wedding } from '../types/database'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useTranslation } from '../i18n/useTranslation'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  wedding: Wedding
  onClose: () => void
}

export function WeddingSettingsPanel({ wedding, onClose }: Props) {
  const tr = useTranslation()
  const s = tr.settings
  const toast = useToast()
  const qc = useQueryClient()

  const [name, setName] = useState(wedding.name)
  const [date, setDate] = useState(wedding.date ?? '')
  const [budgetTotal, setBudgetTotal] = useState<string>(
    wedding.budget_total != null ? String(wedding.budget_total) : ''
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('weddings') as any)
      .update({
        name: name.trim(),
        date: date || null,
        budget_total: budgetTotal !== '' ? Number(budgetTotal) : null,
      })
      .eq('id', wedding.id)

    setSaving(false)

    if (error) {
      toast.error(s.failedToast)
    } else {
      qc.invalidateQueries({ queryKey: ['wedding', wedding.id] })
      toast.success(s.savedToast)
      onClose()
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 ' +
    'text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/25 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-stone-900 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-800 dark:text-stone-100">{s.title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.weddingName}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.weddingDate} <span className="normal-case text-stone-300 font-normal">{s.dateOptional}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1.5">{s.dateHint}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.budgetTotal} <span className="normal-case text-stone-300 font-normal">{s.dateOptional}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">$</span>
              <input
                type="number"
                min={0}
                step={100}
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder={s.budgetTotalPlaceholder}
                className={inputCls}
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1.5">{s.budgetTotalHint}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {saving ? s.saving : s.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium rounded-xl transition-colors text-sm"
            >
              {s.cancel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
