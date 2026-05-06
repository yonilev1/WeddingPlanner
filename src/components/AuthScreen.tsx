import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  onSuccess: () => void
}

export function AuthScreen({ onSuccess }: Props) {
  const tr = useTranslation()
  const a = tr.auth

  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-stone-300 text-stone-800 placeholder-stone-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all text-sm'

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else onSuccess()
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else onSuccess()
  }

  const switchTab = (t: typeof tab) => { setTab(t); setError(null) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-3xl mx-auto mb-4">
            💍
          </div>
          <h1 className="text-2xl font-serif font-semibold text-stone-800">{a.title}</h1>
          <p className="text-stone-500 text-sm mt-1">{a.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-7">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t === 'signin' ? a.signIn : a.createAccount}
              </button>
            ))}
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{a.email}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder={a.emailPlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{a.password}</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
              </div>
              {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors mt-2">
                {loading ? a.signingIn : a.signIn}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{a.yourName}</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder={a.namePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{a.email}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder={a.emailPlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{a.password} <span className="text-stone-400 font-normal">{a.passwordHint}</span></label>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
              </div>
              {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors mt-2">
                {loading ? a.creatingAccount : a.createAccount}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
