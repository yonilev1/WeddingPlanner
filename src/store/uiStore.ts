import { create } from 'zustand'
import type { TaskStatus } from '../types/database'
import { type Language, LANGUAGES } from '../i18n/translations'

type Screen = 'auth' | 'onboarding' | 'pending' | 'app'
type MainTab = 'dashboard' | 'board' | 'budget' | 'people' | 'guests' | 'vendors'
export type ViewMode = 'list' | 'heatmap'

export interface FilterState {
  searchQuery: string
  filterStatus: TaskStatus | 'all'
  filterPriority: number | 'all'
  filterDueDateFrom: string | null
  filterDueDateTo: string | null
}

const defaultFilters: FilterState = {
  searchQuery: '',
  filterStatus: 'all',
  filterPriority: 'all',
  filterDueDateFrom: null,
  filterDueDateTo: null,
}

function readLocalBool(key: string): boolean {
  try { return localStorage.getItem(key) === 'true' } catch { return false }
}

function readLocalLang(): Language {
  try {
    const v = localStorage.getItem('weddingPlanner:language')
    if (v === 'en' || v === 'fr' || v === 'he') return v
  } catch { /* noop */ }
  return 'en'
}

function applyLang(lang: Language) {
  const info = LANGUAGES.find(l => l.code === lang)
  document.documentElement.setAttribute('dir', info?.dir ?? 'ltr')
  document.documentElement.setAttribute('lang', lang)
}

interface UIState {
  screen: Screen
  setScreen: (s: Screen) => void

  activeMainTab: MainTab
  setActiveMainTab: (t: MainTab) => void

  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void

  drawerTaskId: string | null
  openDrawer: (id: string) => void
  closeDrawer: () => void

  expandedTaskIds: string[]
  toggleExpanded: (id: string) => void
  collapseAll: () => void

  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void

  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  clearFilters: () => void
  hasActiveFilters: () => boolean

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  collaboratorPanelOpen: boolean
  setCollaboratorPanelOpen: (open: boolean) => void

  budgetPanelOpen: boolean
  setBudgetPanelOpen: (open: boolean) => void

  // Dark mode
  darkMode: boolean
  toggleDarkMode: () => void

  // Inline add-task
  addingTaskToCategoryId: string | null
  setAddingTaskToCategoryId: (id: string | null) => void

  // Onboarding tour
  tourDone: boolean
  setTourDone: (v: boolean) => void

  // Getting started checklist
  gettingStartedCollapsed: boolean
  setGettingStartedCollapsed: (v: boolean) => void

  // Print view
  printViewOpen: boolean
  setPrintViewOpen: (open: boolean) => void

  // Guest form
  guestFormOpen: boolean
  setGuestFormOpen: (open: boolean) => void

  // Language
  language: Language
  setLanguage: (lang: Language) => void
}

export const useUIStore = create<UIState>()((set, get) => ({
  screen: 'auth',
  setScreen: (screen) => set({ screen }),

  activeMainTab: 'board',
  setActiveMainTab: (activeMainTab) => set({ activeMainTab }),

  selectedCategoryId: null,
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  drawerTaskId: null,
  openDrawer: (drawerTaskId) => set({ drawerTaskId }),
  closeDrawer: () => set({ drawerTaskId: null }),

  expandedTaskIds: [],
  toggleExpanded: (id) =>
    set((state) => ({
      expandedTaskIds: state.expandedTaskIds.includes(id)
        ? state.expandedTaskIds.filter((x) => x !== id)
        : [...state.expandedTaskIds, id],
    })),
  collapseAll: () => set({ expandedTaskIds: [] }),

  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),

  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: defaultFilters }),
  hasActiveFilters: () => {
    const f = get().filters
    return (
      f.searchQuery !== '' ||
      f.filterStatus !== 'all' ||
      f.filterPriority !== 'all' ||
      f.filterDueDateFrom !== null ||
      f.filterDueDateTo !== null
    )
  },

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  collaboratorPanelOpen: false,
  setCollaboratorPanelOpen: (collaboratorPanelOpen) => set({ collaboratorPanelOpen }),

  budgetPanelOpen: false,
  setBudgetPanelOpen: (budgetPanelOpen) => set({ budgetPanelOpen }),

  // Dark mode — persisted in localStorage
  darkMode: readLocalBool('weddingPlanner:darkMode'),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      try { localStorage.setItem('weddingPlanner:darkMode', String(next)) } catch { /* noop */ }
      document.documentElement.classList.toggle('dark', next)
      return { darkMode: next }
    }),

  // Inline add-task
  addingTaskToCategoryId: null,
  setAddingTaskToCategoryId: (addingTaskToCategoryId) => set({ addingTaskToCategoryId }),

  // Onboarding tour — show once per browser
  tourDone: readLocalBool('weddingPlanner:tourDone'),
  setTourDone: (v: boolean) => {
    try { localStorage.setItem('weddingPlanner:tourDone', String(v)) } catch { /* noop */ }
    set({ tourDone: v })
  },

  // Getting started checklist — session-only collapse (not persisted)
  gettingStartedCollapsed: false,
  setGettingStartedCollapsed: (v) => set({ gettingStartedCollapsed: v }),

  // Print view
  printViewOpen: false,
  setPrintViewOpen: (printViewOpen) => set({ printViewOpen }),

  // Guest form
  guestFormOpen: false,
  setGuestFormOpen: (guestFormOpen) => set({ guestFormOpen }),

  // Language — persisted in localStorage; RTL applied to <html>
  language: readLocalLang(),
  setLanguage: (lang) => {
    try { localStorage.setItem('weddingPlanner:language', lang) } catch { /* noop */ }
    applyLang(lang)
    set({ language: lang })
  },
}))
