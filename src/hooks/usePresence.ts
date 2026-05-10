import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PresenceUser {
  userId: string
  name: string
}

export function usePresence(
  weddingId: string | null | undefined,
  userId: string | null | undefined,
  name: string | null | undefined
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!weddingId || !userId) return

    try {
      const channel = supabase.channel(`presence:${weddingId}`, {
        config: { presence: { key: userId } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<{ name: string }>()
          const users: PresenceUser[] = Object.entries(state).map(([uid, presences]) => ({
            userId: uid,
            name: (presences as Array<{ name: string }>)[0]?.name ?? 'Unknown',
          }))
          setOnlineUsers(users)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ name: name ?? 'Unknown' })
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.debug('Presence subscription setup failed:', err)
      return undefined
    }
  }, [weddingId, userId, name])

  return onlineUsers
}
