import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Guest } from '../types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const guestsTable = () => (supabase as any).from('guests')

export function useGuests(weddingId: string) {
  return useQuery<Guest[]>({
    queryKey: ['guests', weddingId],
    queryFn: async () => {
      const { data, error } = await guestsTable()
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!weddingId,
  })
}

export function useAddGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (guest: Omit<Guest, 'id' | 'created_at'>) => {
      const { data, error } = await guestsTable().insert(guest).select().single()
      if (error) throw error
      return data as Guest
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['guests', vars.wedding_id] })
    },
  })
}

export function useUpdateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, wedding_id, ...updates }: Partial<Guest> & { id: string; wedding_id: string }) => {
      const { data, error } = await guestsTable().update(updates).eq('id', id).select().single()
      if (error) throw error
      return { data: data as Guest, wedding_id }
    },
    onSuccess: ({ wedding_id }) => {
      qc.invalidateQueries({ queryKey: ['guests', wedding_id] })
    },
  })
}

export function useDeleteGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, wedding_id }: { id: string; wedding_id: string }) => {
      const { error } = await guestsTable().delete().eq('id', id)
      if (error) throw error
      return { wedding_id }
    },
    onSuccess: ({ wedding_id }) => {
      qc.invalidateQueries({ queryKey: ['guests', wedding_id] })
    },
  })
}
