import { useEffect, useState, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useWedding } from './hooks/useWedding'
import { useTasks, useTaskTree } from './hooks/useTasks'
import { useUIStore } from './store/uiStore'
import { usePresence } from './hooks/usePresence'
import { AuthScreen } from './components/AuthScreen'
import { OnboardingScreen } from './components/OnboardingScreen'
import { DashboardScreen } from './components/DashboardScreen'
import { TaskBoardScreen } from './components/TaskBoardScreen'
import { TaskDetailDrawer } from './components/TaskDetailDrawer'
import { CollaboratorPanel } from './components/CollaboratorPanel'
import { BudgetPanel } from './components/BudgetPanel'
import { ToastContainer } from './components/ToastContainer'
import { OnboardingTour } from './components/OnboardingTour'
import { useTranslation } from './i18n/useTranslation'
import { LANGUAGES, type Language } from './i18n/translations'
import { WeddingSettingsPanel } from './components/WeddingSettingsPanel'

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  const tr = useTranslation()
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">💍</div>
        <p className="text-stone-400 text-sm">{tr.common.loading}</p>
      </div>
    </div>
  )
}

// ─── Sun / Moon icons ─────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M7.05 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

// ─── Language picker ──────────────────────────────────────────────────────────

function LanguagePicker() {
  const { language, setLanguage } = useUIStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = LANGUAGES.find(l => l.code === language)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Language"
        className="flex items-center gap-1 w-auto px-2 h-8 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 text-xs font-medium transition-colors"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code as Language); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-start ${
                language === l.code
                  ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main app shell ───────────────────────────────────────────────────────────

function MainApp({ userId, weddingId }: { userId: string; weddingId: string }) {
  const tr = useTranslation()
  const n = tr.nav

  const { data: wedding } = useWedding(weddingId)
  const { data: allTasks } = useTasks(weddingId)
  const { categories } = useTaskTree(weddingId)
  const { profile, signOut } = useAuth()
  const {
    activeMainTab,
    setActiveMainTab,
    drawerTaskId,
    collaboratorPanelOpen,
    setCollaboratorPanelOpen,
    budgetPanelOpen,
    setBudgetPanelOpen,
    darkMode,
    toggleDarkMode,
    tourDone,
    setTourDone,
  } = useUIStore()

  const onlineUsers = usePresence(weddingId, userId, profile?.name ?? null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Sync dark mode class on mount and change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (!wedding) return <Spinner />

  const daysUntil = wedding.date
    ? Math.ceil((new Date(wedding.date).getTime() - Date.now()) / 86_400_000)
    : null

  const copyShareCode = () => {
    navigator.clipboard.writeText(wedding.share_code).catch(() => {})
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Top nav */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex-shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl leading-none">💍</span>
            <span className="font-serif font-semibold text-stone-800 dark:text-stone-100 max-w-[120px] sm:max-w-[180px] truncate hidden sm:block">
              {wedding.name}
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
            {(['dashboard', 'board'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  activeMainTab === tab
                    ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
              >
                {tab === 'dashboard' ? n.overview : n.tasks}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Countdown chip */}
            {daysUntil !== null && daysUntil >= 0 && (
              <div className="hidden lg:flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
                <span className="text-rose-600 text-xs">💒</span>
                <span className="text-rose-700 text-xs font-semibold">{daysUntil}d</span>
              </div>
            )}

            {/* Share code */}
            <button
              onClick={copyShareCode}
              title={n.copyShareCode}
              className="hidden md:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full px-3 py-1.5 transition-colors font-mono tracking-wider"
            >
              🔗 {wedding.share_code}
            </button>

            {/* Language picker */}
            <LanguagePicker />

            {/* Wedding settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              title={n.settings}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? n.switchToLight : n.switchToDark}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Budget button */}
            <button
              onClick={() => setBudgetPanelOpen(true)}
              title={n.budgetTracker}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                budgetPanelOpen
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Collaborator panel button */}
            <button
              onClick={() => setCollaboratorPanelOpen(!collaboratorPanelOpen)}
              title={n.peopleSharing}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${
                collaboratorPanelOpen
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {onlineUsers.length > 1 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-stone-900 rounded-full" />
              )}
            </button>

            {/* Avatar / sign out */}
            <button
              onClick={signOut}
              title={n.signOut}
              className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 flex items-center justify-center text-rose-600 text-xs font-bold transition-colors"
            >
              {profile?.name?.charAt(0).toUpperCase() ?? '?'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-auto">
        {activeMainTab === 'dashboard' && profile && (
          <DashboardScreen wedding={wedding} profile={profile} />
        )}
        {activeMainTab === 'board' && (
          <TaskBoardScreen wedding={wedding} />
        )}
      </main>

      {/* Panels */}
      {collaboratorPanelOpen && (
        <CollaboratorPanel
          wedding={wedding}
          onlineUsers={onlineUsers}
          onClose={() => setCollaboratorPanelOpen(false)}
        />
      )}
      {budgetPanelOpen && (
        <BudgetPanel
          categories={categories}
          onClose={() => setBudgetPanelOpen(false)}
        />
      )}

      {/* Task detail drawer */}
      {drawerTaskId && allTasks && (
        <TaskDetailDrawer
          taskId={drawerTaskId}
          tasks={allTasks}
          weddingId={weddingId}
        />
      )}

      {/* Wedding settings panel */}
      {settingsOpen && (
        <WeddingSettingsPanel wedding={wedding} onClose={() => setSettingsOpen(false)} />
      )}

      {/* Onboarding tour — show once per browser */}
      {!tourDone && (
        <OnboardingTour onComplete={() => setTourDone(true)} />
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { setScreen, language, setLanguage } = useUIStore()

  // Apply stored language direction on first load
  useEffect(() => {
    setLanguage(language)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) setScreen('auth')
    else if (!profile?.wedding_id) setScreen('onboarding')
    else setScreen('app')
  }, [user, profile?.wedding_id, loading, setScreen])

  if (loading) return <Spinner />
  if (!user) return (
    <>
      <AuthScreen onSuccess={() => {}} />
      <ToastContainer />
    </>
  )
  if (!profile?.wedding_id) return (
    <>
      <OnboardingScreen userId={user.id} onComplete={refreshProfile} />
      <ToastContainer />
    </>
  )

  return (
    <>
      <MainApp userId={user.id} weddingId={profile.wedding_id} />
      <ToastContainer />
    </>
  )
}
