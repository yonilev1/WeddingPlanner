import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DraggableAttributes,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'

type SortableData = ReturnType<typeof useSortable>
type Listeners = SortableData['listeners']
import { CSS } from '@dnd-kit/utilities'
import confetti from 'canvas-confetti'
import type { Wedding, Task, TaskWithSubtasks, TaskStatus } from '../types/database'
import { useTaskTree, useUpdateTask, useBatchReorderTasks, useAddTask } from '../hooks/useTasks'
import { useToast } from '../hooks/useToast'
import { PriorityBadge } from './ui/PriorityBadge'
import { StatusBadge } from './ui/StatusBadge'
import { ProgressBar } from './ui/ProgressBar'
import { HeatmapView } from './HeatmapView'
import { PrintView } from './PrintView'
import { useUIStore } from '../store/uiStore'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'

interface Props {
  wedding: Wedding
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryProgress(cat: TaskWithSubtasks) {
  const subs = cat.subtasks ?? []
  if (!subs.length) return { done: 0, total: 0, percent: 0 }
  const done = subs.filter((t) => t.status === 'done').length
  return { done, total: subs.length, percent: Math.round((done / subs.length) * 100) }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#fb7185', '#e11d48', '#fda4af', '#f97316', '#fbbf24'],
  })
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function matchesFilters(
  task: Task,
  searchQuery: string,
  filterStatus: TaskStatus | 'all',
  filterPriority: number | 'all',
  filterDueDateFrom: string | null,
  filterDueDateTo: string | null
): boolean {
  if (filterStatus !== 'all' && task.status !== filterStatus) return false
  if (filterPriority !== 'all' && task.priority !== filterPriority) return false
  if (filterDueDateFrom && task.due_date && task.due_date < filterDueDateFrom) return false
  if (filterDueDateTo && task.due_date && task.due_date > filterDueDateTo) return false
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    const inTitle = task.title.toLowerCase().includes(q)
    const inDesc = task.description?.toLowerCase().includes(q) ?? false
    if (!inTitle && !inDesc) return false
  }
  return true
}

// ─── Drag handle ──────────────────────────────────────────────────────────────

function DragHandle({ listeners, attributes }: { listeners?: Listeners; attributes: DraggableAttributes }) {
  return (
    <span
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 flex-shrink-0 touch-none select-none px-0.5"
      title="Drag to reorder"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM15 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM15 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM15 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
      </svg>
    </span>
  )
}

// ─── Sortable subtask row ─────────────────────────────────────────────────────

function SortableSubtaskRow({
  task,
  parentId,
  filtersActive,
}: {
  task: Task
  parentId: string
  filtersActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'subtask', parentId },
    disabled: filtersActive,
  })
  const { openDrawer } = useUIStore()
  const updateTask = useUpdateTask()
  const toast = useToast()
  const tr = useTranslation()

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = task.status === 'done' ? 'todo' : 'done'
    updateTask.mutate({ id: task.id, wedding_id: task.wedding_id, status: next, _prevTask: task })
    if (next === 'done') toast.success(`"${task.title}" ${tr.board.markedComplete}`)
  }

  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700/50 group cursor-pointer transition-colors"
      onClick={() => openDrawer(task.id)}
    >
      {!filtersActive && <DragHandle listeners={listeners} attributes={attributes} />}

      <button
        onClick={toggle}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          task.status === 'done'
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-stone-300 dark:border-stone-600 hover:border-rose-400 bg-white dark:bg-stone-700'
        }`}
      >
        {task.status === 'done' && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span
        className={`flex-1 text-sm min-w-0 truncate ${
          task.status === 'done'
            ? 'line-through text-stone-400'
            : 'text-stone-700 dark:text-stone-200'
        }`}
      >
        {task.title}
      </span>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={`text-xs font-medium ${overdue ? 'text-rose-500' : 'text-stone-400'}`}>
            {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
          </span>
        )}
        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  category,
  filtersActive,
  filteredSubtasks,
  weddingId,
}: {
  category: TaskWithSubtasks
  filtersActive: boolean
  filteredSubtasks: Task[]
  weddingId: string
}) {
  const {
    expandedTaskIds,
    toggleExpanded,
    openDrawer,
    addingTaskToCategoryId,
    setAddingTaskToCategoryId,
  } = useUIStore()

  const isExpanded = expandedTaskIds.includes(category.id)
  const isAddingHere = addingTaskToCategoryId === category.id
  const prog = categoryProgress(category)
  const prevPercent = useRef(prog.percent)
  const didMountRef = useRef(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const addTask = useAddTask()
  const toast = useToast()
  const tr = useTranslation()
  const categoryDisplayTitle = (tr.categoryNames as Record<string, string>)[category.title] ?? category.title

  // Auto-expand when user triggers inline add for this category
  useEffect(() => {
    if (isAddingHere && !isExpanded) toggleExpanded(category.id)
  }, [isAddingHere]) // eslint-disable-line react-hooks/exhaustive-deps

  // Confetti when all subtasks complete
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      prevPercent.current = prog.percent
      return
    }
    if (prog.total > 0 && prog.percent === 100 && prevPercent.current < 100) {
      fireConfetti()
      toast.success(`🎉 "${categoryDisplayTitle}" ${tr.board.categoryComplete}`)
    }
    prevPercent.current = prog.percent
  }, [prog.percent, prog.total]) // eslint-disable-line react-hooks/exhaustive-deps

  const subtasksToShow = filtersActive ? filteredSubtasks : (category.subtasks ?? [])
  const subtaskIds = subtasksToShow.map((t) => t.id)

  const submitNewTask = async () => {
    const title = newTaskTitle.trim()
    setNewTaskTitle('')
    setAddingTaskToCategoryId(null)
    if (!title) return
    try {
      await addTask.mutateAsync({ title, weddingId, parentTaskId: category.id })
      toast.success(tr.board.taskAdded)
    } catch {
      toast.error(tr.board.failedAddTask)
    }
  }

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden transition-shadow hover:shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => toggleExpanded(category.id)}
      >
        <svg
          className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="font-semibold text-stone-800 dark:text-stone-100 hover:text-rose-600 transition-colors text-left"
              onClick={(e) => { e.stopPropagation(); openDrawer(category.id) }}
            >
              {categoryDisplayTitle}
            </button>
            <PriorityBadge priority={category.priority} />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <ProgressBar value={prog.percent} className="w-24" />
            <span className="text-xs text-stone-400">{prog.done}/{prog.total}</span>
            {prog.percent === 100 && prog.total > 0 && (
              <span className="text-xs text-emerald-500 font-medium">{tr.board.complete}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {category.due_date && (
            <span className="text-xs text-stone-400 hidden sm:block">{formatDate(category.due_date)}</span>
          )}
          <StatusBadge status={category.status} />
        </div>
      </div>

      {/* Subtasks */}
      {isExpanded && (
        <div className="border-t border-stone-100 dark:border-stone-700 p-2">
          {subtasksToShow.length === 0 && !isAddingHere ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <p className="text-xl">✅</p>
              <p className="text-sm text-stone-400 dark:text-stone-500">
                {filtersActive
                  ? tr.board.noSubtasksFiltered
                  : tr.board.noTasksYet}
              </p>
              {!filtersActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingTaskToCategoryId(category.id) }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium mt-1 transition-colors"
                >
                  {tr.board.addTask}
                </button>
              )}
            </div>
          ) : (
            <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
              {subtasksToShow.map((sub) => (
                <SortableSubtaskRow
                  key={sub.id}
                  task={sub}
                  parentId={category.id}
                  filtersActive={filtersActive}
                />
              ))}
            </SortableContext>
          )}

          {/* Inline add-task input */}
          {isAddingHere && (
            <form
              onSubmit={(e) => { e.preventDefault(); submitNewTask() }}
              className="flex items-center gap-2 px-2 pt-1 pb-1"
            >
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setAddingTaskToCategoryId(null)
                    setNewTaskTitle('')
                  }
                }}
                placeholder={tr.board.taskPlaceholder}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 dark:text-stone-100 text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {tr.board.add}
              </button>
              <button
                type="button"
                onClick={() => { setAddingTaskToCategoryId(null); setNewTaskTitle('') }}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          )}

          {/* Add task button row when subtasks already exist */}
          {!isAddingHere && subtasksToShow.length > 0 && !filtersActive && (
            <button
              onClick={(e) => { e.stopPropagation(); setAddingTaskToCategoryId(category.id) }}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {tr.board.addTask}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sortable sidebar item ────────────────────────────────────────────────────

function SortableCategoryItem({
  cat,
  active,
  filtersActive,
  onClick,
}: {
  cat: TaskWithSubtasks
  active: boolean
  filtersActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
    data: { type: 'category' },
    disabled: filtersActive,
  })
  const p = categoryProgress(cat)
  const tr = useTranslation()
  const displayTitle = (tr.categoryNames as Record<string, string>)[cat.title] ?? cat.title

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group">
      {!filtersActive && <DragHandle listeners={listeners} attributes={attributes} />}
      <button
        onClick={onClick}
        className={`flex-1 text-left px-3 py-2.5 rounded-xl transition-all border ${
          active
            ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
            : 'border-transparent text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-800 dark:hover:text-stone-100'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium truncate">{displayTitle}</span>
          <span className={`text-xs flex-shrink-0 ${active ? 'text-rose-500' : 'text-stone-400'}`}>
            {p.done}/{p.total}
          </span>
        </div>
        <ProgressBar value={p.percent} className="mt-1.5" color={active ? 'bg-rose-400' : 'bg-stone-400'} />
      </button>
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar() {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useUIStore()
  const [showDateRange, setShowDateRange] = useState(false)
  const active = hasActiveFilters()
  const tr = useTranslation()

  const inputCls =
    'px-3 py-1.5 text-sm rounded-xl border border-stone-200 dark:border-stone-600 ' +
    'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          id="task-search-input"
          type="text"
          placeholder={tr.board.searchPlaceholder}
          value={filters.searchQuery}
          onChange={(e) => setFilter('searchQuery', e.target.value)}
          className={`${inputCls} pl-8 w-full`}
        />
      </div>

      {/* Status */}
      <select
        value={filters.filterStatus}
        onChange={(e) => setFilter('filterStatus', e.target.value as TaskStatus | 'all')}
        className={inputCls}
      >
        <option value="all">{tr.board.anyStatus}</option>
        <option value="todo">{tr.board.notStarted}</option>
        <option value="in_progress">{tr.board.inProgress}</option>
        <option value="done">{tr.board.done}</option>
      </select>

      {/* Priority */}
      <select
        value={filters.filterPriority === 'all' ? 'all' : String(filters.filterPriority)}
        onChange={(e) =>
          setFilter('filterPriority', e.target.value === 'all' ? 'all' : Number(e.target.value))
        }
        className={inputCls}
      >
        <option value="all">{tr.board.anyPriority}</option>
        <option value="5">P5 — Critical</option>
        <option value="4">P4 — High</option>
        <option value="3">P3 — Medium</option>
        <option value="2">P2 — Low</option>
        <option value="1">P1 — Very Low</option>
      </select>

      {/* Date range toggle */}
      <button
        onClick={() => setShowDateRange((v) => !v)}
        className={`${inputCls} flex items-center gap-1.5 ${showDateRange ? 'border-rose-300 text-rose-600' : ''}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {tr.board.date}
      </button>

      {showDateRange && (
        <>
          <input
            type="date"
            value={filters.filterDueDateFrom ?? ''}
            onChange={(e) => setFilter('filterDueDateFrom', e.target.value || null)}
            className={inputCls}
            title="Due date from"
          />
          <span className="text-stone-400 text-sm">–</span>
          <input
            type="date"
            value={filters.filterDueDateTo ?? ''}
            onChange={(e) => setFilter('filterDueDateTo', e.target.value || null)}
            className={inputCls}
            title="Due date to"
          />
        </>
      )}

      {active && (
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors font-medium"
        >
          {tr.board.clear}
        </button>
      )}
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function TaskBoardScreen({ wedding }: Props) {
  const { categories, isPending } = useTaskTree(wedding.id)
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    viewMode,
    setViewMode,
    filters,
    hasActiveFilters,
    clearFilters,
    sidebarOpen,
    setSidebarOpen,
    drawerTaskId,
    closeDrawer,
    expandedTaskIds,
    toggleExpanded,
    addingTaskToCategoryId,
    setAddingTaskToCategoryId,
    printViewOpen,
    setPrintViewOpen,
  } = useUIStore()
  const qc = useQueryClient()
  const autoSelectedRef = useRef(false)
  const batchReorder = useBatchReorderTasks()
  const addTask = useAddTask()
  const toast = useToast()
  const tr = useTranslation()
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryTitle, setNewCategoryTitle] = useState('')

  const filtersActive = hasActiveFilters()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Auto-select first category on load
  useEffect(() => {
    if (!autoSelectedRef.current && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
      autoSelectedRef.current = true
    }
  }, [categories.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime task updates
  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${wedding.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `wedding_id=eq.${wedding.id}` },
        () => qc.invalidateQueries({ queryKey: ['tasks', wedding.id] })
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [wedding.id, qc])

  const effectiveId = selectedCategoryId ?? categories[0]?.id ?? null

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Escape always closes things (check before isTyping guard)
      if (e.key === 'Escape') {
        if (addingTaskToCategoryId) { setAddingTaskToCategoryId(null); return }
        if (addingCategory) { setAddingCategory(false); setNewCategoryTitle(''); return }
        if (drawerTaskId) { closeDrawer(); return }
        if (sidebarOpen) { setSidebarOpen(false); return }
        return
      }

      if (isTyping) return

      // / → focus search
      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('task-search-input')?.focus()
        return
      }

      // N → add task to selected category
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        if (effectiveId) {
          if (!expandedTaskIds.includes(effectiveId)) toggleExpanded(effectiveId)
          setAddingTaskToCategoryId(effectiveId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    addingTaskToCategoryId, setAddingTaskToCategoryId,
    addingCategory,
    drawerTaskId, closeDrawer,
    sidebarOpen, setSidebarOpen,
    effectiveId, expandedTaskIds, toggleExpanded,
  ])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const type = active.data.current?.type

      if (type === 'category') {
        const oldIdx = categories.findIndex((c) => c.id === active.id)
        const newIdx = categories.findIndex((c) => c.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return
        batchReorder.mutate({
          weddingId: wedding.id,
          updates: arrayMove(categories, oldIdx, newIdx).map((c, i) => ({ id: c.id, display_order: i + 1 })),
        })
      } else if (type === 'subtask') {
        const parentId = active.data.current?.parentId as string | undefined
        if (!parentId) return
        const cat = categories.find((c) => c.id === parentId)
        if (!cat) return
        const subtasks = cat.subtasks ?? []
        const oldIdx = subtasks.findIndex((t) => t.id === active.id)
        const newIdx = subtasks.findIndex((t) => t.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return
        batchReorder.mutate({
          weddingId: wedding.id,
          updates: arrayMove(subtasks, oldIdx, newIdx).map((t, i) => ({ id: t.id, display_order: i + 1 })),
        })
      }
    },
    [categories, batchReorder, wedding.id]
  )

  // Filtered categories for main content
  const filteredCategories = categories
    .map((cat) => {
      const filteredSubs = (cat.subtasks ?? []).filter((t) =>
        matchesFilters(t, filters.searchQuery, filters.filterStatus, filters.filterPriority, filters.filterDueDateFrom, filters.filterDueDateTo)
      )
      return { cat, filteredSubs }
    })
    .filter(({ cat, filteredSubs }) => {
      if (!filtersActive) return true
      return (
        matchesFilters(cat, filters.searchQuery, filters.filterStatus, filters.filterPriority, filters.filterDueDateFrom, filters.filterDueDateTo) ||
        filteredSubs.length > 0
      )
    })

  const displayItems = filtersActive
    ? filteredCategories
    : effectiveId
    ? filteredCategories.filter(({ cat }) => cat.id === effectiveId)
    : filteredCategories

  const categoryIds = categories.map((c) => c.id)
  const selectedCategory = categories.find((c) => c.id === effectiveId)
  const selectedCategoryTitle = selectedCategory
    ? ((tr.categoryNames as Record<string, string>)[selectedCategory.title] ?? selectedCategory.title)
    : ''

  const submitNewCategory = async () => {
    const title = newCategoryTitle.trim()
    setNewCategoryTitle('')
    setAddingCategory(false)
    if (!title) return
    try {
      await addTask.mutateAsync({ title, weddingId: wedding.id, parentTaskId: null })
      toast.success(tr.board.categoryAdded)
    } catch {
      toast.error(tr.board.failedAddCategory)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 dark:text-stone-500 text-sm">
        {tr.common.loading}
      </div>
    )
  }

  return (
    <>
      {printViewOpen && (
        <PrintView
          categories={categories}
          weddingName={wedding.name}
          onClose={() => setPrintViewOpen(false)}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex h-full min-h-0 overflow-hidden relative">

          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-stone-900/40 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside
            className={`
              fixed md:static inset-y-0 start-0 z-30
              w-72 flex-shrink-0 border-e border-stone-200 dark:border-stone-700
              bg-white dark:bg-stone-900
              flex flex-col overflow-hidden
              transition-transform duration-200
              ${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full md:translate-x-0'}
            `}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2">{tr.board.categories}</p>
              <button
                className="md:hidden p-1 text-stone-400 hover:text-stone-600"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-0.5 min-h-0">
              {categories.length === 0 ? (
                <div className="py-10 text-center px-3">
                  <p className="text-3xl mb-2">🗂️</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed">
                    {tr.board.noCategoriesYet}<br />{tr.board.noCategoriesHint}
                  </p>
                </div>
              ) : (
                <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                  {categories.map((cat) => (
                    <SortableCategoryItem
                      key={cat.id}
                      cat={cat}
                      active={!filtersActive && cat.id === effectiveId}
                      filtersActive={filtersActive}
                      onClick={() => {
                        if (!filtersActive) setSelectedCategoryId(cat.id === effectiveId ? null : cat.id)
                        setSidebarOpen(false)
                      }}
                    />
                  ))}
                </SortableContext>
              )}
            </div>

            {/* Add category footer */}
            <div className="px-3 pb-3 pt-2 border-t border-stone-200 dark:border-stone-700 flex-shrink-0">
              {addingCategory ? (
                <form onSubmit={(e) => { e.preventDefault(); submitNewCategory() }} className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newCategoryTitle}
                    onChange={(e) => setNewCategoryTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setAddingCategory(false)
                        setNewCategoryTitle('')
                      }
                    }}
                    placeholder={tr.board.categoryPlaceholder}
                    className="flex-1 px-2.5 py-1.5 text-sm rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <button type="submit" className="px-2.5 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-xl">{tr.board.add}</button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingCategory(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-500 dark:text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {tr.board.addCategory}
                </button>
              )}
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger — shows at start (left in LTR, right in RTL) */}
                <button
                  className="md:hidden p-2 -ms-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
                  onClick={() => setSidebarOpen(true)}
                  title={tr.board.categories}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  {filtersActive ? (
                    <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-stone-100">{tr.board.searchResults}</h2>
                  ) : selectedCategory ? (
                    <>
                      <h2 className="text-lg sm:text-xl font-serif font-semibold text-stone-800 dark:text-stone-100 truncate">
                        {selectedCategoryTitle}
                      </h2>
                      {(() => {
                        const p = categoryProgress(selectedCategory)
                        return (
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                            {p.done} {tr.board.of} {p.total} {tr.board.subtasksComplete}
                          </p>
                        )
                      })()}
                    </>
                  ) : (
                    <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-stone-100">{tr.board.weddingTasks}</h2>
                  )}
                </div>

                {/* Print button */}
                <button
                  onClick={() => setPrintViewOpen(true)}
                  title="Print / Export PDF"
                  className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>

                {/* View mode toggle */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-700 rounded-xl p-1 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('list')}
                    title="List view"
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-stone-600 shadow-sm text-stone-700 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('heatmap')}
                    title="Calendar view"
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'heatmap' ? 'bg-white dark:bg-stone-600 shadow-sm text-stone-700 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {viewMode === 'list' && <FilterBar />}
            </div>

            {/* Content */}
            {viewMode === 'heatmap' ? (
              <HeatmapView categories={categories} />
            ) : categories.length === 0 ? (
              /* No categories yet — full empty state */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <p className="text-6xl mb-4">💐</p>
                  <h3 className="text-xl font-serif font-semibold text-stone-700 dark:text-stone-200 mb-2">
                    {tr.board.startPlanning}
                  </h3>
                  <p className="text-stone-400 dark:text-stone-500 text-sm mb-6">
                    {tr.board.startPlanningHint}
                  </p>
                  <button
                    onClick={() => setAddingCategory(true)}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors"
                  >
                    {tr.board.addFirstCategory}
                  </button>
                  <p className="text-xs text-stone-400 dark:text-stone-600 mt-4">
                    {tr.board.tipPress} <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-stone-500 font-mono">N</kbd> {tr.board.toAddTasks} · <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-stone-500 font-mono">/</kbd> {tr.board.toSearch}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 sm:px-6 pb-8 space-y-3 max-w-3xl">
                {displayItems.length === 0 && filtersActive && (
                  <div className="text-center py-16">
                    <p className="text-3xl mb-3">🔍</p>
                    <p className="text-stone-500 dark:text-stone-400 text-sm">{tr.board.noTasksMatch}</p>
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
                    >
                      {tr.board.clearFilters}
                    </button>
                  </div>
                )}
                {displayItems.map(({ cat, filteredSubs }) => (
                  <TaskCard
                    key={cat.id}
                    category={cat}
                    filtersActive={filtersActive}
                    filteredSubtasks={filteredSubs}
                    weddingId={wedding.id}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        <DragOverlay>
          <div className="bg-white dark:bg-stone-700 rounded-xl border border-rose-200 shadow-lg px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-100 opacity-90">
            {tr.board.moving}
          </div>
        </DragOverlay>
      </DndContext>
    </>
  )
}
