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

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ d, size = 16, sw = 1.5 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  sun:      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707.707M7.05 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon:     "M21 13a9 9 0 1 1-9-10 7 7 0 0 0 9 10z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  printer:  "M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  globe:    "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  home:     "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z",
  list:     "M4 6h16M4 12h16M4 18h16",
  wallet:   "M2 8h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zM2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2M12 14h.01",
  users:    "M17 21a5 5 0 0 0-10 0M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21a5 5 0 0 0-7.5-4.33M2 21a5 5 0 0 1 7.5-4.33",
  signout:  "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1",
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  const tr = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <p className="font-display text-5xl mb-4" style={{ color: 'var(--ink)' }}>e</p>
        <p className="text-xs uppercase tracking-widest font-mono-ui" style={{ color: 'var(--ink-4)' }}>{tr.common.loading}</p>
      </div>
    </div>
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
        style={iconBtnStyle}
      >
        <Icon d={ICONS.globe} size={14} />
        <span className="hidden sm:inline text-xs ml-1">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-10 z-50 rounded-xl overflow-hidden min-w-[140px] anim-pop"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code as Language); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-start transition-colors"
              style={{
                background: language === l.code ? 'var(--accent-soft)' : 'transparent',
                color: language === l.code ? 'var(--accent-ink)' : 'var(--ink-2)',
              }}
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

const iconBtnStyle: React.CSSProperties = {
  height: 32, minWidth: 32, padding: '0 8px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  background: 'var(--bg-card)', color: 'var(--ink-3)',
  border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer',
  transition: 'all 120ms',
}

// ─── Main app shell ───────────────────────────────────────────────────────────

type MainTab = 'dashboard' | 'board' | 'budget' | 'people'

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
    darkMode,
    toggleDarkMode,
    tourDone,
    setTourDone,
  } = useUIStore()

  const onlineUsers = usePresence(weddingId, userId, profile?.name ?? null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (!wedding) return <Spinner />

  const daysUntil = wedding.date
    ? Math.max(0, Math.ceil((new Date(wedding.date).getTime() - Date.now()) / 86_400_000))
    : null

  const NAV: [MainTab, string, string][] = [
    ['dashboard', n.overview,   ICONS.home],
    ['board',     n.tasks,      ICONS.list],
    ['budget',    n.budgetTracker, ICONS.wallet],
    ['people',    n.peopleSharing, ICONS.users],
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <header style={{
        height: 56, borderBottom: '1px solid var(--line)',
        background: 'var(--bg-card)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
      }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--accent)', color: 'white',
            display: 'grid', placeItems: 'center',
            fontFamily: '"Instrument Serif", serif', fontSize: 16,
          }}>e</div>
          <div className="hidden sm:block leading-none">
            <p className="font-display text-sm font-medium" style={{ color: 'var(--ink)' }}>everafter</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
              {wedding.name}
            </p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-0.5" style={{ marginInlineStart: 4 }}>
          {NAV.map(([id, label, iconPath]) => {
            const active = activeMainTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveMainTab(id as any)}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  background: active ? 'var(--bg-soft)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Icon d={iconPath} size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Countdown chip */}
        {daysUntil !== null && (
          <div className="hidden lg:flex items-baseline gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <span className="font-display tabular-nums text-base" style={{ color: 'var(--ink)' }}>{daysUntil}</span>
            <span className="font-mono-ui text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>
              days
            </span>
          </div>
        )}

        {/* Online avatars */}
        {onlineUsers.length > 1 && (
          <div className="hidden md:flex items-center" style={{ marginInlineStart: -4 }}>
            {onlineUsers.slice(0, 4).map((u, i) => (
              <div key={u.userId} style={{ marginInlineStart: i === 0 ? 0 : -8, zIndex: 4 - i, position: 'relative' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 600,
                  border: '2px solid var(--bg-card)',
                }}>
                  {(u.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: 999,
                  background: 'var(--ok)', border: '2px solid var(--bg-card)'
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Icon actions */}
        <button onClick={toggleDarkMode} title={darkMode ? n.switchToLight : n.switchToDark} style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
          <Icon d={darkMode ? ICONS.sun : ICONS.moon} size={14} />
        </button>
        <span className="hidden sm:contents">
          <button onClick={() => setSettingsOpen(true)} title={n.settings} style={iconBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
            <Icon d={ICONS.settings} size={14} />
          </button>
          <LanguagePicker />
          <button onClick={signOut} title={n.signOut} style={iconBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
            <Icon d={ICONS.signout} size={14} />
          </button>
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {activeMainTab === 'dashboard' && profile && (
          <DashboardScreen wedding={wedding} profile={profile} />
        )}
        {activeMainTab === 'board' && (
          <TaskBoardScreen wedding={wedding} />
        )}
        {activeMainTab === 'budget' && (
          <BudgetPanel categories={categories} onClose={() => setActiveMainTab('dashboard' as any)} asPage />
        )}
        {activeMainTab === 'people' && (
          <CollaboratorPanel
            wedding={wedding}
            onlineUsers={onlineUsers}
            onClose={() => setActiveMainTab('dashboard' as any)}
            asPage
          />
        )}
      </main>

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

      {/* Onboarding tour */}
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
