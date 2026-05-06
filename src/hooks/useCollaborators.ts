import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export function useCollaborators(weddingId: string | null | undefined) {
  return useQuery({
    queryKey: ['collaborators', weddingId],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wedding_id', weddingId!)
      if (error) throw error
      return data
    },
    enabled: !!weddingId,
    staleTime: 60_000,
  })
}
