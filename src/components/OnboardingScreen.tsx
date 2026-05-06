import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  userId: string
  onComplete: () => void
}

export function OnboardingScreen({ userId, onComplete }: Props) {
  const tr = useTranslation()
  const o = tr.onboarding

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [weddingName, setWeddingName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-stone-300 text-stone-800 placeholder-stone-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all text-sm'

  const linkProfile = async (weddingId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({ wedding_id: weddingId, name: displayName || null })
      .eq('id', userId)
    return error as { message: string } | null
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const weddingId = crypto.randomUUID()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: wErr } = await (supabase.from('weddings') as any)
      .insert({ id: weddingId, name: weddingName, date: weddingDate || null })

    if (wErr) {
      setError(wErr?.message ?? o.failedCreate)
      setLoading(false)
      return
    }

    const pErr = await linkProfile(weddingId)
    if (pErr) { setError(pErr.message); setLoading(false); return }

    onComplete()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcErr } = await (supabase as any)
      .rpc('find_wedding_by_share_code', { p_share_code: shareCode.toUpperCase() })

    const rows = data as { id: string }[] | null

    if (rpcErr || !rows || rows.length === 0) {
      setError(o.weddingNotFound)
      setLoading(false)
      return
    }

    const pErr = await linkProfile(rows[0].id)
    if (pErr) { setError(pErr.message); setLoading(false); return }

    onComplete()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-3xl mx-auto mb-4">
            💒
          </div>
          <h1 className="text-2xl font-serif font-semibold text-stone-800">{o.title}</h1>
          <p className="text-stone-500 text-sm mt-1">{o.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-7">
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t === 'create' ? o.newWedding : o.joinWithCode}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{o.yourName}</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder={o.namePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  {o.weddingName} <span className="text-rose-500">*</span>
                </label>
                <input type="text" required value={weddingName} onChange={(e) => setWeddingName(e.target.value)} className={inputCls} placeholder={o.weddingNamePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  {o.weddingDate} <span className="text-stone-400 font-normal">{o.weddingDateOptional}</span>
                </label>
                <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className={inputCls} />
                <p className="text-xs text-stone-400 mt-1.5">{o.weddingDateHint}</p>
              </div>
              {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors mt-2">
                {loading ? o.creating : o.createWedding}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{o.yourName}</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder={o.namePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  {o.shareCode} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  className={`${inputCls} uppercase tracking-[0.25em] text-center text-lg font-mono`}
                  placeholder={o.shareCodePlaceholder}
                />
                <p className="text-xs text-stone-400 mt-1.5">{o.shareCodeHint}</p>
              </div>
              {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors mt-2">
                {loading ? o.joining : o.joinWedding}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
