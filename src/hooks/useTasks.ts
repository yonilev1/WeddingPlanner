import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Task, TaskWithSubtasks } from '../types/database'
import { arrayMove } from '@dnd-kit/sortable'
export { arrayMove }

export function useAddTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      title,
      weddingId,
      parentTaskId,
    }: {
      title: string
      weddingId: string
      parentTaskId: string | null
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .insert({
          title,
          wedding_id: weddingId,
          parent_task_id: parentTaskId,
          status: 'todo',
          display_order: 9999,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.weddingId] })
    },
  })
}

export function useTasks(weddingId: string | null | undefined) {
  return useQuery({
    queryKey: ['tasks', weddingId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('wedding_id', weddingId!)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!weddingId,
    staleTime: 30_000,
  })
}

export function useTaskTree(weddingId: string | null | undefined) {
  const query = useTasks(weddingId)

  const categories: TaskWithSubtasks[] = []
  if (query.data) {
    for (const parent of query.data.filter((t) => t.parent_task_id === null)) {
      categories.push({
        ...parent,
        subtasks: query.data
          .filter((t) => t.parent_task_id === parent.id)
          .sort((a, b) => a.display_order - b.display_order),
      })
    }
  }

  return { ...query, categories }
}

export function useUpdateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, wedding_id: _wid, ...updates }: Partial<Task> & { id: string; wedding_id: string }) => {
      // Cast to any — Supabase JS v2 / TypeScript 6 type-level incompatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = (supabase.from('tasks') as any)
      const { data, error } = await builder
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ id, wedding_id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks', wedding_id] })
      const prev = qc.getQueryData<Task[]>(['tasks', wedding_id])
      qc.setQueryData<Task[]>(['tasks', wedding_id], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...updates } : t)) ?? []
      )
      return { prev, wedding_id }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['tasks', ctx.wedding_id], ctx.prev)
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.wedding_id] })
    },
  })
}

export function useBatchReorderTasks() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      updates,
    }: {
      weddingId: string
      updates: { id: string; display_order: number }[]
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = supabase.from('tasks') as any
      await Promise.all(
        updates.map(({ id, display_order }) =>
          tbl.update({ display_order }).eq('id', id)
        )
      )
    },
    onMutate: async ({ weddingId, updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks', weddingId] })
      const prev = qc.getQueryData<Task[]>(['tasks', weddingId])
      const orderMap = new Map(updates.map((u) => [u.id, u.display_order]))
      qc.setQueryData<Task[]>(['tasks', weddingId], (old) =>
        old
          ?.map((t) => (orderMap.has(t.id) ? { ...t, display_order: orderMap.get(t.id)! } : t))
          .sort((a, b) => a.display_order - b.display_order) ?? []
      )
      return { prev, weddingId }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['tasks', ctx.weddingId], ctx.prev)
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.weddingId] })
    },
  })
}
