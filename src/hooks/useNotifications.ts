import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types/database'

export function useNotifications(userId: string | null | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async (): Promise<Notification[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('notifications') as any)
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
    staleTime: 30_000,
  })

  // Realtime: new notifications pushed to this user
  useEffect(() => {
    if (!userId) return

    try {
      const ch = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => qc.invalidateQueries({ queryKey: ['notifications', userId] })
        )
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    } catch (err) {
      console.debug('Notification subscription setup failed:', err)
      return undefined
    }
  }, [userId, qc])

  return query
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('notifications') as any)
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })
}

export function useInsertNotifications() {
  return useMutation({
    mutationFn: async (rows: Array<{ user_id: string; wedding_id: string; task_id: string; message: string }>) => {
      if (!rows.length) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('notifications') as any).insert(
        rows.map(r => ({ ...r, type: 'mention' }))
      )
      if (error) throw error
    },
  })
}
