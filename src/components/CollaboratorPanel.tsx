import { useState } from 'react'
import type { Wedding } from '../types/database'
import { useCollaborators } from '../hooks/useCollaborators'
import type { PresenceUser } from '../hooks/usePresence'
import { useTranslation } from '../i18n/useTranslation'
import { useApproveMember, useRejectMember, useRemoveMember, useSetMemberRole } from '../hooks/useAdminActions'

interface Props {
  wedding: Wedding
  onlineUsers: PresenceUser[]
  onClose: () => void
  asPage?: boolean
  isAdmin?: boolean
  currentUserId?: string
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function CollaboratorPanel({ wedding, onlineUsers, onClose, asPage, isAdmin = false, currentUserId = '' }: Props) {
  const { data: collaborators } = useCollaborators(wedding.id)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const tr = useTranslation()
  const c = tr.collaborator
  const a = tr.admin

  const approveMember = useApproveMember(wedding.id)
  const rejectMember = useRejectMember(wedding.id)
  const removeMember = useRemoveMember(wedding.id)
  const setMemberRole = useSetMemberRole(wedding.id)

  const onlineIds = new Set(onlineUsers.map((u) => u.userId))
  const shareLink = `${window.location.origin}?code=${wedding.share_code}`

  const pendingMembers = collaborators?.filter(p => p.member_status === 'pending') ?? []
  const activeMembers = collaborators?.filter(p => p.member_status === 'active') ?? []

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

      {/* Pending members section (admin only) */}
      {isAdmin && pendingMembers.length > 0 && (
        <>
          <p className="font-display" style={{ fontSize: 22, marginBottom: 12, marginTop: 32, color: 'var(--ink)' }}>
            {a.pendingMembers}
          </p>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--warn)', borderRadius: 12, overflow: 'hidden',
            marginBottom: 32,
          }}>
            {pendingMembers.map((profile, i) => (
              <div key={profile.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: 'var(--warn-soft)', color: 'var(--warn)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 14, fontWeight: 600,
                }}>
                  {initials(profile.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{profile.name ?? 'Unknown'}</p>
                  <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--warn)', marginTop: 2 }}>
                    Awaiting approval
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => approveMember.mutate(profile.id)}
                    disabled={approveMember.isPending}
                    style={{
                      height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
                      background: 'var(--ok)', color: 'white',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      transition: 'all 120ms', opacity: approveMember.isPending ? 0.6 : 1,
                    }}
                  >
                    {a.approveJoin}
                  </button>
                  <button
                    onClick={() => rejectMember.mutate(profile.id)}
                    disabled={rejectMember.isPending}
                    style={{
                      height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bad)', color: 'white',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      transition: 'all 120ms', opacity: rejectMember.isPending ? 0.6 : 1,
                    }}
                  >
                    {a.rejectJoin}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active members section */}
      <p className="font-display" style={{ fontSize: 22, marginBottom: 12, color: 'var(--ink)' }}>
        {a.activeMembers}
      </p>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
      }}>
        {activeMembers.map((profile, i) => {
          const isOnline = onlineIds.has(profile.id)
          const isAdmin_ = profile.role === 'admin'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{profile.name ?? 'Unknown'}</p>
                  {isAdmin_ && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {a.adminBadge}
                    </span>
                  )}
                </div>
                {isOnline && (
                  <p className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ok)', marginTop: 2 }}>{c.onlineNow}</p>
                )}
              </div>
              {isAdmin && profile.id !== currentUserId && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setMemberRole.mutate({ profileId: profile.id, role: isAdmin_ ? 'member' : 'admin' })}
                    disabled={setMemberRole.isPending}
                    style={{
                      height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
                      background: isAdmin_ ? 'var(--bad-soft)' : 'var(--accent-soft)',
                      color: isAdmin_ ? 'var(--bad)' : 'var(--accent-ink)',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      transition: 'all 120ms', opacity: setMemberRole.isPending ? 0.6 : 1,
                    }}
                  >
                    {isAdmin_ ? a.removeAdmin : a.makeAdmin}
                  </button>
                  <button
                    onClick={() => removeMember.mutate(profile.id)}
                    disabled={removeMember.isPending}
                    style={{
                      height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bad-soft)', color: 'var(--bad)',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      transition: 'all 120ms', opacity: removeMember.isPending ? 0.6 : 1,
                    }}
                  >
                    {a.removeFromEvent}
                  </button>
                </div>
              )}
              {!isAdmin && (
                (isOnline ? (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: 'var(--ok-soft)', color: 'var(--ok)',
                    border: '1px solid var(--ok-soft)',
                  }}>{c.online}</span>
                ) : (
                  <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>offline</span>
                ))
              )}
            </div>
          )
        })}
        {!activeMembers.length && (
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
            {c.members} ({activeMembers?.length ?? 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }} className="scrollbar-thin">
            {activeMembers?.map((profile) => {
              const isOnline = onlineIds.has(profile.id)
              const isAdmin_ = profile.role === 'admin'
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
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <p style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.name ?? 'Unknown'}
                      {isAdmin_ && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, padding: '1px 4px', marginLeft: 6, borderRadius: 3,
                          background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                          display: 'inline-block',
                        }}>ADMIN</span>
                      )}
                    </p>
                  </div>
                  {isOnline && <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ok)', flexShrink: 0 }}>online</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
