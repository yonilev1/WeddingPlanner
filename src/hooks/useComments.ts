import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Comment, CommentWithAuthor, TaskActivity, TaskActivityWithActor } from '../types/database'
import { useToast } from './useToast'

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      const comments = (data ?? []) as Comment[]

      const userIds = [...new Set(comments.map((c) => c.user_id))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profilesQ = userIds.length
        ? await (supabase.from('profiles') as any).select('id, name, avatar_url').in('id', userIds)
        : { data: [] }
      type ProfileRow = { id: string; name: string | null; avatar_url: string | null }
      const profileMap = Object.fromEntries(
        ((profilesQ.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
      )

      return comments.map((c) => ({
        ...c,
        author: profileMap[c.user_id] ?? { id: c.user_id, name: 'Unknown', avatar_url: null },
      }))
    },
    enabled: !!taskId,
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId, text, userId, weddingId, mentionedUserIds = [],
    }: {
      taskId: string; text: string; userId: string
      weddingId?: string; mentionedUserIds?: string[]
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('comments') as any)
        .insert({ task_id: taskId, text, user_id: userId })
        .select()
        .single()
      if (error) throw error

      // Notify mentioned users (skip the commenter themselves)
      if (weddingId && mentionedUserIds.length) {
        const rows = mentionedUserIds
          .filter(uid => uid !== userId)
          .map(uid => ({ user_id: uid, wedding_id: weddingId, task_id: taskId, type: 'mention', message: text }))
        if (rows.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('notifications') as any).insert(rows)
        }
      }

      return data
    },
    onSuccess: (_d, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
    },
  })
}

export function useActivity(taskId: string | null) {
  return useQuery({
    queryKey: ['activity', taskId],
    queryFn: async (): Promise<TaskActivityWithActor[]> => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      const activity = (data ?? []) as TaskActivity[]

      const userIds = [...new Set(activity.map((a) => a.user_id))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profilesQ2 = userIds.length
        ? await (supabase.from('profiles') as any).select('id, name, avatar_url').in('id', userIds)
        : { data: [] }
      type ProfileRow2 = { id: string; name: string | null; avatar_url: string | null }
      const profileMap = Object.fromEntries(
        ((profilesQ2.data ?? []) as ProfileRow2[]).map((p) => [p.id, p])
      )

      return activity.map((a) => ({
        ...a,
        actor: profileMap[a.user_id] ?? { id: a.user_id, name: 'Unknown', avatar_url: null },
      }))
    },
    enabled: !!taskId,
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: (_d, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
      toast.success('Comment deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`)
    },
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async ({ commentId, text, taskId }: { commentId: string; text: string; taskId: string }) => {
      const { error } = await supabase.from('comments').update({ text }).eq('id', commentId)
      if (error) throw error
    },
    onSuccess: (_d, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
      toast.success('Comment updated')
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`)
    },
  })
}
