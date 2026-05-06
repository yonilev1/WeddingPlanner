import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wedding } from '../types/database'

export function useWedding(weddingId: string | null | undefined) {
  return useQuery({
    queryKey: ['wedding', weddingId],
    queryFn: async (): Promise<Wedding> => {
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!weddingId,
    staleTime: 60_000,
  })
}
