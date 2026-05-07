import { useState } from 'react'
import type { Wedding } from '../types/database'
import { useCollaborators } from '../hooks/useCollaborators'
import type { PresenceUser } from '../hooks/usePresence'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  wedding: Wedding
  onlineUsers: PresenceUser[]
  onClose: () => void
  asPage?: boolean
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function CollaboratorPanel({ wedding, onlineUsers, onClose, asPage }: Props) {
  const { data: collaborators } = useCollaborators(wedding.id)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const tr = useTranslation()
  const c = tr.collaborator

  const onlineIds = new Set(onlineUsers.map((u) => u.userId))
  const shareLink = `${window.location.origin}?code=${wedding.share_code}`

  const copy = async (type: 'code' | 'link') => {
    const text = type === 'code' ? wedding.share_code : shareLink
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const inner = (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 40px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p className="font-display" style={{ fontSize: 44, lineHeight: 1.1, color: 'var(--ink)' }}>{c.title}</p>
        <p style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>{c.shareHint}</p>
      </div>

      {/* Share card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 16,
        padding: 28, marginBottom: 32,
      }}>
        <p className="font-display" style={{ fontSize: 22, marginBottom: 6, color: 'var(--ink)' }}>{c.inviteOthers}</p>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.55 }}>{c.shareHint}</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="font-mono-ui" style={{
            fontSize: 18, fontWeight: 500,
            padding: '10px 16px', letterSpacing: '0.08em',
            background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8,
          }}>{wedding.share_code}</div>
          <button
            onClick={() => copy('code')}
            style={{
              height: 36, padding: '0 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-card)', color: 'var(--ink)',
              border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 120ms',
            }}
          >
            {copied === 'code' ? c.copied : 'Copy code'}
          </button>
          <button
            onClick={() => copy('link')}
            style={{
              height: 36, padding: '0 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-card)', color: 'var(--ink-2)',
              border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 120ms',
            }}
          >
            {copied === 'link' ? c.copiedShort : c.copyLink}
          </button>
        </div>
      </div>

      {/* Members list */}
      <p className="font-display" style={{ fontSize: 22, marginBottom: 12, color: 'var(--ink)' }}>
        {c.members}
      </p>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
      }}>
        {collaborators?.map((profile, i) => {
          const isOnline = onlineIds.has(profile.id)
          return (
            <div key={profile.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 14, fontWeight: 600,
                }}>
                  {initials(profile.name)}
                </div>
                {isOnline && (
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 12, height: 12, borderRadius: 999,
                    background: 'var(--ok)', border: '2px solid var(--bg-card)'
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{profile.name ?? 'Unknown'}</p>
                {isOnline && (
                  <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ok)', marginTop: 2 }}>{c.onlineNow}</p>
                )}
              </div>
              {isOnline ? (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 999,
                  background: 'var(--ok-soft)', color: 'var(--ok)',
                  border: '1px solid var(--ok-soft)',
                }}>{c.online}</span>
              ) : (
                <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>offline</span>
              )}
            </div>
          )
        })}
        {!collaborators?.length && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <p className="font-display" style={{ fontSize: 32, marginBottom: 8 }}>○</p>
            <p style={{ fontSize: 14 }}>{c.noMembers}</p>
          </div>
        )}
      </div>
    </div>
  )

  if (asPage) {
    return <div className="overflow-auto scrollbar-thin" style={{ minHeight: '100%', background: 'var(--bg)' }}>{inner}</div>
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed end-3 top-16 z-50 w-80 rounded-2xl overflow-hidden anim-pop"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.title}</p>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', borderRadius: 6 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: 16 }}>
          {/* Compact share */}
          <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{c.inviteOthers}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="font-mono-ui" style={{
                flex: 1, fontSize: 14, fontWeight: 500, letterSpacing: '0.06em',
                padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8,
                color: 'var(--ink)',
              }}>{wedding.share_code}</span>
              <button
                onClick={() => copy('code')}
                style={{ height: 36, padding: '0 12px', fontSize: 12, fontWeight: 500, background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >{copied === 'code' ? c.copiedShort : 'Copy'}</button>
            </div>
          </div>

          {/* Compact member list */}
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            {c.members} ({collaborators?.length ?? 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }} className="scrollbar-thin">
            {collaborators?.map((profile) => {
              const isOnline = onlineIds.has(profile.id)
              return (
                <div key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 999,
                      background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                      display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
                    }}>{initials(profile.name)}</div>
                    {isOnline && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: 999, background: 'var(--ok)', border: '2px solid var(--bg-card)' }} />}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name ?? 'Unknown'}</p>
                  {isOnline && <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ok)' }}>online</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
