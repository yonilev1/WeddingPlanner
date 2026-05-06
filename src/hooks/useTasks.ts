import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Task, TaskWithSubtasks, TaskActivityAction } from '../types/database'
import { arrayMove } from '@dnd-kit/sortable'
export { arrayMove }

async function logActivity(
  taskId: string,
  userId: string,
  action: TaskActivityAction,
  oldVal: string | null,
  newVal: string | null,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('task_activity') as any).insert({
    task_id: taskId,
    user_id: userId,
    action,
    old_value: oldVal,
    new_value: newVal,
  })
}

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
    mutationFn: async ({
      id,
      wedding_id: _wid,
      _prevTask,
      ...updates
    }: Partial<Task> & { id: string; wedding_id: string; _prevTask?: Task }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { data, prevTask: _prevTask, updates }
    },
    onSuccess: async ({ data, prevTask, updates }) => {
      if (!prevTask) return
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) return
      const logs: Promise<void>[] = []
      if (updates.status !== undefined && updates.status !== prevTask.status)
        logs.push(logActivity(data.id, userId, 'status_changed', prevTask.status, updates.status))
      if (updates.priority !== undefined && updates.priority !== prevTask.priority)
        logs.push(logActivity(data.id, userId, 'priority_changed', String(prevTask.priority), String(updates.priority)))
      if (updates.title !== undefined && updates.title !== prevTask.title)
        logs.push(logActivity(data.id, userId, 'title_changed', prevTask.title, updates.title))
      if (updates.description !== undefined && updates.description !== prevTask.description)
        logs.push(logActivity(data.id, userId, 'description_changed', null, null))
      if (updates.due_date !== undefined && updates.due_date !== prevTask.due_date)
        logs.push(logActivity(data.id, userId, 'due_date_changed', prevTask.due_date ?? null, updates.due_date ?? null))
      await Promise.all(logs)
      if (logs.length > 0) qc.invalidateQueries({ queryKey: ['activity', data.id] })
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

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, weddingId }: { id: string; weddingId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any).delete().eq('id', id)
      if (error) throw error
      return { id, weddingId }
    },
    onSuccess: (_d, { weddingId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', weddingId] })
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
