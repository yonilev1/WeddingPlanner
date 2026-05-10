import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vendor } from '../types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vendorsTable = () => (supabase as any).from('vendors')

export function useVendors(weddingId: string) {
  const qc = useQueryClient()

  const query = useQuery<Vendor[]>({
    queryKey: ['vendors', weddingId],
    queryFn: async () => {
      const { data, error } = await vendorsTable()
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!weddingId,
  })

  useEffect(() => {
    if (!weddingId) return

    let subscription: any = null

    try {
      const vendorTable = vendorsTable()
      if (!vendorTable?.on) {
        console.debug('Vendor realtime subscription not available')
        return
      }

      subscription = vendorTable
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vendors',
            filter: `wedding_id=eq.${weddingId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
          }
        )
        .subscribe()
    } catch (err) {
      console.debug('Vendor subscription setup failed:', err)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe().catch(() => {})
      }
    }
  }, [weddingId, qc])

  return query
}

export function useAddVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id' | 'created_at'>) => {
      const { data, error } = await vendorsTable().insert(vendor).select().single()
      if (error) throw error
      return data as Vendor
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['vendors', vars.wedding_id] })
    },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, wedding_id, ...updates }: Partial<Vendor> & { id: string; wedding_id: string }) => {
      const { data, error } = await vendorsTable().update(updates).eq('id', id).select().single()
      if (error) throw error
      return { data: data as Vendor, wedding_id }
    },
    onSuccess: ({ wedding_id }) => {
      qc.invalidateQueries({ queryKey: ['vendors', wedding_id] })
    },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, wedding_id }: { id: string; wedding_id: string }) => {
      const { error } = await vendorsTable().delete().eq('id', id)
      if (error) throw error
      return { wedding_id }
    },
    onSuccess: ({ wedding_id }) => {
      qc.invalidateQueries({ queryKey: ['vendors', wedding_id] })
    },
  })
}
