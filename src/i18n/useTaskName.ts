import { useTranslation } from './useTranslation'

/**
 * Returns a function that translates a task title if it is a known seeded
 * default task, or falls back to the raw title for user-created tasks.
 *
 * Usage:  const taskName = useTaskName()
 *         taskName(task.title)   // → translated string or original
 */
export function useTaskName() {
  const tr = useTranslation()
  const map = tr.taskNames as Record<string, string>
  const catMap = tr.categoryNames as Record<string, string>
  return (title: string): string => map[title] ?? catMap[title] ?? title
}
