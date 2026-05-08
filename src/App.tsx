import { useEffect, useState, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useWedding } from './hooks/useWedding'
import { useTasks, useTaskTree } from './hooks/useTasks'
import { useUIStore } from './store/uiStore'
import { usePresence } from './hooks/usePresence'
import { useNotifications, useMarkNotificationsRead } from './hooks/useNotifications'
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
import { GuestListScreen } from './components/GuestListScreen'
import { VendorScreen } from './components/VendorScreen'

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
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  guests:   "M17 21a5 5 0 0 0-10 0M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21a5 5 0 0 0-5-5M1 21a5 5 0 0 1 5-5",
  vendors:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
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

// ─── Notification bell ────────────────────────────────────────────────────────

function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: notifications = [] } = useNotifications(userId)
  const markRead = useMarkNotificationsRead()
  const { openDrawer } = useUIStore()

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen(o => !o)
    if (!open && unread > 0) markRead.mutate(userId)
  }

  function handleClick(taskId: string) {
    setOpen(false)
    openDrawer(taskId)
  }

  function relTime(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{ ...iconBtnStyle, position: 'relative' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
      >
        <Icon d={ICONS.bell} size={14} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 999, padding: '0 4px',
            background: 'var(--accent)', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
            border: '2px solid var(--bg-card)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, zIndex: 50,
          width: 300, maxHeight: 400, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--line)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }} className="anim-pop scrollbar-thin">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Notifications</p>
            {notifications.length > 0 && (
              <span className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{notifications.length} total</span>
            )}
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>No notifications yet</p>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n.task_id)}
                style={{
                  width: '100%', textAlign: 'start', padding: '12px 16px',
                  background: n.read ? 'transparent' : 'var(--accent-soft)',
                  border: 'none', borderBottom: '1px solid var(--line-soft)',
                  cursor: 'pointer', transition: 'background 120ms', display: 'block',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--accent-soft)')}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>@</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: 'var(--ink)', marginBottom: 2 }}>
                      You were mentioned in a comment
                    </p>
                    {n.message && (
                      <p style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.message}
                      </p>
                    )}
                    <p className="font-mono-ui" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>{relTime(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main app shell ───────────────────────────────────────────────────────────

type MainTab = 'dashboard' | 'board' | 'budget' | 'people' | 'guests' | 'vendors'

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
    ['dashboard', n.overview,      ICONS.home],
    ['board',     n.tasks,         ICONS.list],
    ['budget',    n.budgetTracker, ICONS.wallet],
    ['guests',    n.guests,        ICONS.guests],
    ['vendors',   n.vendors,       ICONS.vendors],
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
            <p className="font-display text-sm font-medium" style={{ color: 'var(--ink)', fontStyle: 'italic' }}>everafter</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
              {wedding.name.replace(/\s*wedding\s*/i, '')}
            </p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-stretch gap-0" style={{ marginInlineStart: 4, alignSelf: 'stretch' }}>
          {NAV.map(([id, label, iconPath]) => {
            const active = activeMainTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveMainTab(id as any)}
                className="flex items-center gap-1.5 px-3 text-xs font-medium transition-all"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
                  display: 'inline-flex', alignItems: 'center',
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
            style={{ background: 'var(--ink)', border: 'none' }}>
            <span className="font-display tabular-nums text-base" style={{ color: 'var(--bg)', fontStyle: 'italic' }}>{daysUntil}</span>
            <span className="font-mono-ui text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
              days to go
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
        <NotificationBell userId={userId} />
        <button onClick={toggleDarkMode} title={darkMode ? n.switchToLight : n.switchToDark} style={iconBtnStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
          <Icon d={darkMode ? ICONS.sun : ICONS.moon} size={14} />
        </button>
        <span className="hidden sm:contents">
          {profile?.role === 'admin' && (
            <button onClick={() => setSettingsOpen(true)} title={n.settings} style={iconBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
              <Icon d={ICONS.settings} size={14} />
            </button>
          )}
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
        {activeMainTab === 'guests' && (
          <GuestListScreen weddingId={weddingId} />
        )}
        {activeMainTab === 'vendors' && (
          <VendorScreen weddingId={weddingId} />
        )}
        {activeMainTab === 'people' && (
          <CollaboratorPanel
            wedding={wedding}
            onlineUsers={onlineUsers}
            onClose={() => setActiveMainTab('dashboard' as any)}
            asPage
            isAdmin={profile?.role === 'admin'}
            currentUserId={userId}
          />
        )}
      </main>

      {/* Task detail drawer */}
      {drawerTaskId && allTasks && (
        <TaskDetailDrawer
          taskId={drawerTaskId}
          tasks={allTasks}
          weddingId={weddingId}
          isAdmin={profile?.role === 'admin'}
          userId={userId}
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

function PendingApprovalScreen() {
  const tr = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md text-center">
        <div style={{
          width: 64, height: 64, background: 'var(--accent-soft)', color: 'var(--accent-ink)',
          borderRadius: 16, display: 'grid', placeItems: 'center',
          fontSize: 32, marginBottom: 24, marginLeft: 'auto', marginRight: 'auto'
        }}>⏳</div>
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          {tr.admin.pendingApproval}
        </h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 24 }}>
          {tr.admin.waitingForApproval}
        </p>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          The event admin will review your request and add you to the event. Check back soon!
        </p>
      </div>
    </div>
  )
}

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
    else if (profile?.member_status === 'pending') setScreen('pending')
    else setScreen('app')
  }, [user, profile?.wedding_id, profile?.member_status, loading, setScreen])

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
  if (profile?.member_status === 'pending') return (
    <>
      <PendingApprovalScreen />
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
