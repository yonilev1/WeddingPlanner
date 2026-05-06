import { useUIStore } from '../store/uiStore'
import t from './translations'

export function useTranslation() {
  const language = useUIStore((s) => s.language)
  return t[language]
}
