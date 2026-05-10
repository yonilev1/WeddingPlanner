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
import type { Wedding, Task, TaskWithSubtasks, TaskStatus, Profile } from '../types/database'
import { useTaskTree, useUpdateTask, useBatchReorderTasks, useAddTask } from '../hooks/useTasks'
import { useCollaborators } from '../hooks/useCollaborators'
import { useToast } from '../hooks/useToast'
import { PriorityBadge } from './ui/PriorityBadge'
import { StatusBadge } from './ui/StatusBadge'
import { ProgressBar } from './ui/ProgressBar'
import { HeatmapView } from './HeatmapView'
import { PrintView } from './PrintView'
import { useUIStore } from '../store/uiStore'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../i18n/useTranslation'
import { useTaskName } from '../i18n/useTaskName'

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
      className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none select-none px-0.5"
      style={{ color: 'var(--line)' }}
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
  collaborators,
  currentUserId,
}: {
  task: Task
  parentId: string
  filtersActive: boolean
  collaborators: Profile[]
  currentUserId: string | null
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
  const taskName = useTaskName()

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = task.status === 'done' ? 'todo' : 'done'
    updateTask.mutate({ id: task.id, wedding_id: task.wedding_id, status: next, _prevTask: task })
    if (next === 'done') toast.success(`"${taskName(task.title)}" ${tr.board.markedComplete}`)
  }

  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()
  const isMyTask = task.assigned_to && task.assigned_to === currentUserId
  const assignee = task.assigned_to ? collaborators.find(c => c.id === task.assigned_to) : null
  const assigneeInitials = assignee?.name
    ? assignee.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderTop: '1px solid var(--line-soft)',
        background: isMyTask ? 'color-mix(in oklch, var(--accent) 6%, transparent)' : 'transparent',
      }}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg group cursor-pointer transition-colors"
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = isMyTask ? 'color-mix(in oklch, var(--accent) 6%, transparent)' : 'transparent')}
      onClick={() => openDrawer(task.id)}
    >
      {!filtersActive && <DragHandle listeners={listeners} attributes={attributes} />}

      <button
        onClick={toggle}
        style={{
          width: 18, height: 18, borderRadius: 999, flexShrink: 0,
          border: task.status === 'done' ? 'none' : '1.5px solid var(--ink-4)',
          background: task.status === 'done' ? 'var(--ink)' : 'transparent',
          display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, transition: 'all 120ms',
        }}
      >
        {task.status === 'done' && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span
        style={{
          flex: 1, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: task.status === 'done' ? 'var(--ink-4)' : 'var(--ink-2)',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}
      >
        {taskName(task.title)}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Assignee avatar — always visible */}
        {assigneeInitials && (
          <div
            title={assignee?.name ?? ''}
            style={{
              width: 24, height: 24, borderRadius: 999, flexShrink: 0,
              background: isMyTask ? 'var(--accent)' : 'var(--bg-soft)',
              color: isMyTask ? '#fff' : 'var(--ink-3)',
              border: `1.5px solid ${isMyTask ? 'var(--accent)' : 'var(--line)'}`,
              display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700,
            }}
          >
            {assigneeInitials}
          </div>
        )}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity sm:flex">
          <PriorityBadge priority={task.priority} />
          {task.due_date && (
            <span className="font-mono-ui" style={{ fontSize: 12, color: overdue ? 'var(--bad)' : 'var(--ink-4)' }}>
              {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
            </span>
          )}
        </div>
        <svg style={{ color: 'var(--ink-4)' }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  collaborators,
  currentUserId,
}: {
  category: TaskWithSubtasks
  filtersActive: boolean
  filteredSubtasks: Task[]
  weddingId: string
  collaborators: Profile[]
  currentUserId: string | null
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
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => toggleExpanded(category.id)}
      >
        <svg
          style={{ color: 'var(--ink-4)', flexShrink: 0, transition: 'transform 200ms', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
          className="w-4 h-4"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start', transition: 'color 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
              onClick={(e) => { e.stopPropagation(); openDrawer(category.id) }}
            >
              {categoryDisplayTitle}
            </button>
            <PriorityBadge priority={category.priority} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <ProgressBar value={prog.percent} className="w-24" />
            <span className="font-mono-ui" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{prog.done}/{prog.total}</span>
            {prog.percent === 100 && prog.total > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 500 }}>{tr.board.complete}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {category.due_date && (
            <span className="font-mono-ui hidden sm:block" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{formatDate(category.due_date)}</span>
          )}
          <StatusBadge status={category.status} />
        </div>
      </div>

      {/* Subtasks */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: 8 }}>
          {subtasksToShow.length === 0 && !isAddingHere ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
              <p style={{ fontSize: 20 }}>✅</p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                {filtersActive
                  ? tr.board.noSubtasksFiltered
                  : tr.board.noTasksYet}
              </p>
              {!filtersActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingTaskToCategoryId(category.id) }}
                  style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, transition: 'opacity 120ms' }}
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
                  collaborators={collaborators}
                  currentUserId={currentUserId}
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
                style={{ flex: 1, padding: '7px 12px', fontSize: 14, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--ink)', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ padding: '7px 14px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'opacity 120ms' }}
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
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, color: 'var(--ink-4)', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 2, transition: 'color 120ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
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
        style={{
          flex: 1, textAlign: 'start', padding: '10px 12px', borderRadius: 10, transition: 'all 120ms',
          border: active ? '1px solid var(--accent-soft)' : '1px solid transparent',
          background: active ? 'var(--accent-soft)' : 'transparent',
          color: active ? 'var(--accent-ink)' : 'var(--ink-3)',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)' } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</span>
          <span className="font-mono-ui" style={{ fontSize: 11, flexShrink: 0, color: active ? 'var(--accent-ink)' : 'var(--ink-4)' }}>
            {p.done}/{p.total}
          </span>
        </div>
        <ProgressBar value={p.percent} className="mt-1.5" />
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

  const inputStyle = {
    padding: '6px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)',
    outline: 'none', transition: 'border-color 120ms',
  }

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
          style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
        />
      </div>

      {/* Status */}
      <select
        value={filters.filterStatus}
        onChange={(e) => setFilter('filterStatus', e.target.value as TaskStatus | 'all')}
        style={inputStyle}
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
        style={inputStyle}
      >
        <option value="all">{tr.board.anyPriority}</option>
        <option value="5">{tr.drawer.p5Label}</option>
        <option value="4">{tr.drawer.p4Label}</option>
        <option value="3">{tr.drawer.p3Label}</option>
        <option value="2">{tr.drawer.p2Label}</option>
        <option value="1">{tr.drawer.p1Label}</option>
      </select>

      {/* Date range toggle */}
      <button
        onClick={() => setShowDateRange((v) => !v)}
        style={{ ...inputStyle, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderColor: showDateRange ? 'var(--accent)' : undefined, color: showDateRange ? 'var(--accent-ink)' : undefined }}
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
            style={inputStyle}
            title="Due date from"
          />
          <span style={{ color: 'var(--ink-4)', fontSize: 13 }}>–</span>
          <input
            type="date"
            value={filters.filterDueDateTo ?? ''}
            onChange={(e) => setFilter('filterDueDateTo', e.target.value || null)}
            style={inputStyle}
            title="Due date to"
          />
        </>
      )}

      {active && (
        <button
          onClick={clearFilters}
          style={{ ...inputStyle, color: 'var(--accent-ink)', borderColor: 'var(--accent-soft)', background: 'var(--accent-soft)', fontWeight: 500, cursor: 'pointer' }}
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
  const { data: collaborators = [] } = useCollaborators(wedding.id)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: 'var(--ink-3)', fontSize: 13 }}>
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
              w-72 flex-shrink-0
              flex flex-col overflow-hidden
              transition-transform duration-200
              ${sidebarOpen ? 'translate-x-0' : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full'}
            `}
            style={{ borderInlineEnd: '1px solid var(--line)', background: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
              <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px' }}>{tr.board.categories}</p>
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
            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
              {addingCategory ? (
                <form onSubmit={(e) => { e.preventDefault(); submitNewCategory() }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--ink)', outline: 'none' }}
                  />
                  <button type="submit" style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer' }}>{tr.board.add}</button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingCategory(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ink-3)', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'color 120ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
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
                {/* Mobile hamburger */}
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  {filtersActive ? (
                    <h2 className="font-display" style={{ fontSize: 22, color: 'var(--ink)' }}>{tr.board.searchResults}</h2>
                  ) : selectedCategory ? (
                    <>
                      <h2 className="font-display" style={{ fontSize: 22, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedCategoryTitle}
                      </h2>
                      {(() => {
                        const p = categoryProgress(selectedCategory)
                        return (
                          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                            {p.done} {tr.board.of} {p.total} {tr.board.subtasksComplete}
                          </p>
                        )
                      })()}
                    </>
                  ) : (
                    <h2 className="font-display" style={{ fontSize: 22, color: 'var(--ink)' }}>{tr.board.weddingTasks}</h2>
                  )}
                </div>

                {/* Print button */}
                <button
                  onClick={() => setPrintViewOpen(true)}
                  title="Print / Export PDF"
                  style={{ padding: 8, color: 'var(--ink-4)', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'color 120ms, background 120ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>

                {/* View mode toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-soft)', borderRadius: 10, padding: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setViewMode('list')}
                    title="List view"
                    style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 120ms', background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'list' ? 'var(--ink)' : 'var(--ink-4)' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('heatmap')}
                    title="Calendar view"
                    style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 120ms', background: viewMode === 'heatmap' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'heatmap' ? 'var(--ink)' : 'var(--ink-4)' }}
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
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <div style={{ textAlign: 'center', maxWidth: 360 }}>
                  <p style={{ fontSize: 48, marginBottom: 16 }}>💐</p>
                  <h3 className="font-display" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>
                    {tr.board.startPlanning}
                  </h3>
                  <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24 }}>
                    {tr.board.startPlanningHint}
                  </p>
                  <button
                    onClick={() => setAddingCategory(true)}
                    style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, transition: 'opacity 120ms' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >
                    {tr.board.addFirstCategory}
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 16 }}>
                    {tr.board.tipPress} <kbd style={{ padding: '2px 6px', background: 'var(--bg-soft)', borderRadius: 6, color: 'var(--ink-3)', fontFamily: 'monospace', fontSize: 11 }}>N</kbd> {tr.board.toAddTasks} · <kbd style={{ padding: '2px 6px', background: 'var(--bg-soft)', borderRadius: 6, color: 'var(--ink-3)', fontFamily: 'monospace', fontSize: 11 }}>/</kbd> {tr.board.toSearch}
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
                    collaborators={collaborators}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        <DragOverlay>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--accent-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--ink)', opacity: 0.9 }}>
            {tr.board.moving}
          </div>
        </DragOverlay>
      </DndContext>
    </>
  )
}
