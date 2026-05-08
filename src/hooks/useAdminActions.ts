import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

export function useApproveMember(weddingId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async (profileId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ member_status: 'active' })
        .eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', weddingId] })
      toast.success('Member approved')
    },
    onError: (error) => {
      toast.error(`Failed to approve member: ${error.message}`)
    },
  })
}

export function useRejectMember(weddingId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async (profileId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ wedding_id: null })
        .eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', weddingId] })
      toast.success('Member rejected')
    },
    onError: (error) => {
      toast.error(`Failed to reject member: ${error.message}`)
    },
  })
}

export function useRemoveMember(weddingId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async (profileId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ wedding_id: null })
        .eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', weddingId] })
      toast.success('Member removed from event')
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`)
    },
  })
}

export function useSetMemberRole(weddingId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: 'admin' | 'member' }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ role })
        .eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', weddingId] })
      toast.success('Member role updated')
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`)
    },
  })
}
