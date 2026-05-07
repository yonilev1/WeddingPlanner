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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
    outline: 'none', transition: 'border-color 120ms', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* Left stripe — decorative panel */}
      <div
        className="hidden md:flex"
        style={{
          width: '42%', flexShrink: 0,
          background: 'var(--bg-card)',
          borderInlineEnd: '1px solid var(--line)',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 48px',
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <span className="font-display" style={{ fontSize: 28, color: '#fff', lineHeight: 1 }}>e</span>
          </div>
          <p className="font-display" style={{ fontSize: 28, color: 'var(--ink)', lineHeight: 1.1 }}>everafter</p>
        </div>

        {/* Couple name placeholder */}
        <div style={{ textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', color: 'var(--ink)', lineHeight: 1.1, marginBottom: 16 }}>
            Your day,<br />
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>perfectly</span> planned.
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 260, margin: '0 auto', lineHeight: 1.6 }}>
            Every task, every detail, every moment — all in one place.
          </p>
        </div>

        {/* Subtle decoration */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>
          everafter · wedding planner
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile brand */}
          <div className="flex md:hidden" style={{ justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-display" style={{ fontSize: 20, color: '#fff' }}>e</span>
              </div>
              <span className="font-display" style={{ fontSize: 22, color: 'var(--ink)' }}>everafter</span>
            </div>
          </div>

          <h1 className="font-display" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 4 }}>
            {tab === 'signin' ? a.signIn : a.createAccount}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 32 }}>
            {a.subtitle}
          </p>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 0, background: 'var(--bg-soft)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500,
                  borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 120ms',
                  background: tab === t ? 'var(--bg-card)' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {t === 'signin' ? a.signIn : a.createAccount}
              </button>
            ))}
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{a.email}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder={a.emailPlaceholder}
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--accent)')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--line)')}
                />
              </div>
              <div>
                <label style={labelStyle}>{a.password}</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••"
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--accent)')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--line)')}
                />
              </div>
              {error && (
                <p style={{ fontSize: 13, color: 'var(--bad)', background: 'var(--bad-soft)', border: '1px solid var(--bad-soft)', padding: '10px 12px', borderRadius: 10 }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '11px 0', background: 'var(--accent)', color: '#fff', fontWeight: 500, fontSize: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, transition: 'opacity 120ms' }}
              >
                {loading ? a.signingIn : a.signIn}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{a.yourName}</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder={a.namePlaceholder}
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--accent)')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--line)')}
                />
              </div>
              <div>
                <label style={labelStyle}>{a.email}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder={a.emailPlaceholder}
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--accent)')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--line)')}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {a.password}
                  {a.passwordHint && <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}> {a.passwordHint}</span>}
                </label>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••"
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--accent)')}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'var(--line)')}
                />
              </div>
              {error && (
                <p style={{ fontSize: 13, color: 'var(--bad)', background: 'var(--bad-soft)', border: '1px solid var(--bad-soft)', padding: '10px 12px', borderRadius: 10 }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '11px 0', background: 'var(--accent)', color: '#fff', fontWeight: 500, fontSize: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, transition: 'opacity 120ms' }}
              >
                {loading ? a.creatingAccount : a.createAccount}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
