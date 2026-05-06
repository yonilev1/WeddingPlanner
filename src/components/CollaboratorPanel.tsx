import { useState } from 'react'
import type { Wedding } from '../types/database'
import { useCollaborators } from '../hooks/useCollaborators'
import type { PresenceUser } from '../hooks/usePresence'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  wedding: Wedding
  onlineUsers: PresenceUser[]
  onClose: () => void
}

export function CollaboratorPanel({ wedding, onlineUsers, onClose }: Props) {
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
    } catch {
      // ignore
    }
  }

  function initials(name: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-3 top-16 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800 text-sm">{c.title}</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invite section */}
        <div className="p-3 border-b border-stone-100 space-y-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{c.inviteOthers}</p>
          <div className="flex gap-2">
            <button
              onClick={() => copy('code')}
              className="flex-1 text-xs font-mono bg-stone-100 hover:bg-stone-200 rounded-xl px-3 py-2 text-stone-600 transition-colors text-left truncate"
            >
              {copied === 'code' ? c.copied : `Code: ${wedding.share_code}`}
            </button>
            <button
              onClick={() => copy('link')}
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl px-3 py-2 font-medium transition-colors flex-shrink-0"
            >
              {copied === 'link' ? c.copiedShort : c.copyLink}
            </button>
          </div>
          <p className="text-xs text-stone-400">{c.shareHint}</p>
        </div>

        {/* Collaborators list */}
        <div className="p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {c.members} ({collaborators?.length ?? 0})
            </p>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-stone-400">{onlineUsers.length} {c.online}</span>
            </div>
          </div>
          <div className="space-y-2">
            {collaborators?.map((profile) => {
              const isOnline = onlineIds.has(profile.id)
              return (
                <div key={profile.id} className="flex items-center gap-2.5 py-0.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">
                      {initials(profile.name)}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 truncate font-medium">
                      {profile.name ?? 'Unknown'}
                    </p>
                    {isOnline && (
                      <p className="text-xs text-emerald-500 leading-none mt-0.5">{c.onlineNow}</p>
                    )}
                  </div>
                </div>
              )
            })}
            {!collaborators?.length && (
              <p className="text-xs text-stone-400 py-2 text-center">{c.noMembers}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
