# Wedding Planner — Project Context

## 1. Project Overview

A collaborative wedding planning web app where couples and their planning team can:
- Track all planning tasks organized by category (venue, catering, photography, etc.)
- Monitor progress via a dashboard with countdown, completion stats, and urgent task alerts
- Manage task details: status, priority, due date, notes, comments, and activity history
- Share a wedding with collaborators via a unique share code
- View tasks in a calendar heatmap and print a checklist PDF
- Track budget with per-category cost estimates and actuals

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Styling | Tailwind CSS v3 — warm palette (rose, stone, amber) |
| Server state | React Query v5 (`@tanstack/react-query`) |
| Local UI state | Zustand v5 |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| DB migrations | Raw SQL in `supabase/migrations/` |

## 3. Architecture

### Single-page conditional rendering (no router)
`App.tsx` checks auth state and renders one of four screens:
```
loading → <Spinner>
no user → <AuthScreen>
no wedding → <OnboardingScreen>
ready    → <MainApp> (Dashboard or Task Board + optional TaskDetailDrawer)
```

### State layers
- **Supabase** — source of truth; all writes go straight to DB
- **React Query** — caches server data per `weddingId`/`taskId`; optimistic updates on task edits
- **Zustand (`uiStore`)** — ephemeral UI: active tab, selected category, open drawer task ID, expanded task IDs, dark mode, language, tour progress (all localStorage-persisted)
- **Supabase Realtime** — `postgres_changes` subscriptions invalidate React Query cache for live multi-user sync

### Task hierarchy
Tasks are flat rows with a `parent_task_id` FK (NULL = category/top-level). The app organizes them client-side into `TaskWithSubtasks[]` via `useTaskTree()`.

### RLS + SECURITY DEFINER
Every table has RLS. The helper `get_user_wedding_id()` (SECURITY DEFINER) is used in all policies to resolve the current user's wedding without exposing `profiles` directly. The seed trigger function also runs as SECURITY DEFINER to bypass RLS during the initial task seeding (the profile hasn't been linked to the new wedding yet at trigger time).

### i18n / Translation system
All user-facing strings live in `src/i18n/translations.ts`, typed `as const` so keys are compile-time checked. Three languages: `en`, `fr`, `he` (Hebrew, RTL). Each component imports `useTranslation()` and accesses its section (e.g., `tr.drawer`, `tr.heatmap`, `tr.print`).

Locale-aware date/currency formatting uses a `LOCALE_MAP` pattern:
```ts
const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', he: 'he-IL' }
const locale = LOCALE_MAP[language] ?? 'en-US'
new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
```
This pattern is used in: `DashboardScreen`, `TaskDetailDrawer`, `BudgetPanel`, `HeatmapView`, `PrintView`.

### RTL/LTR sidebar layout — critical CSS note
The sidebar uses directional transforms for mobile slide-in/out. **Important:** Tailwind's `ltr:` and `rtl:` variants add an attribute selector (`[dir="ltr"]`) to the CSS rule, giving them specificity `[0,1,1]` — which beats a breakpoint-only class like `md:translate-x-0` at `[0,0,1]`. This caused the sidebar to stay hidden on desktop in LTR mode.

**Fix:** Use `max-md:ltr:` and `max-md:rtl:` so the directional transform only exists inside a `@media(max-width:767px)` block and never competes with desktop layout at all:
```tsx
// CORRECT — rules only exist on mobile, no specificity battle on desktop
className={sidebarOpen ? 'translate-x-0' : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full'}
```

## 4. Key Files & Structure

```
src/
├── lib/supabase.ts              Supabase client (typed with Database generic)
├── types/database.ts            All DB types + convenience aliases
├── store/uiStore.ts             Zustand store: UI state, dark mode, language, tour progress (localStorage-persisted)
├── i18n/
│   ├── translations.ts          All en/fr/he strings, typed as const
│   └── useTranslation.ts        Hook that returns the active language's translation object
├── hooks/
│   ├── useAuth.ts               Auth state + profile, signOut, refreshProfile
│   ├── useWedding.ts            Fetches single wedding row
│   ├── useTasks.ts              useTasks, useTaskTree, useUpdateTask (optimistic+activity log), useAddTask, useDeleteTask
│   ├── useComments.ts           useComments, useAddComment, useActivity
│   ├── useToast.ts              Toast store (message, kind, auto-dismiss 3s)
│   └── usePresence.ts           Real-time user presence tracking
├── components/
│   ├── ui/
│   │   ├── PriorityBadge.tsx    P1-P5 colored badges
│   │   ├── StatusBadge.tsx      todo / in_progress / done
│   │   └── ProgressBar.tsx      Configurable animated progress bar
│   ├── AuthScreen.tsx           Sign in / Create account (blush gradient card)
│   ├── OnboardingScreen.tsx     New wedding / Join with code
│   ├── DashboardScreen.tsx      Countdown, progress, categories, urgent tasks (click → opens drawer)
│   ├── TaskBoardScreen.tsx      Category sidebar + expandable task cards + realtime + keyboard shortcuts
│   ├── TaskDetailDrawer.tsx     Right-panel drawer: details / comments / activity; delete with confirmation
│   ├── WeddingSettingsPanel.tsx Right-panel drawer for editing wedding name and date
│   ├── ToastContainer.tsx       Fixed bottom-right toast notifications (success/error)
│   ├── HeatmapView.tsx          3-month calendar heatmap with color-coded task dots by priority
│   ├── PrintView.tsx            Full-screen print preview, checklist by category
│   ├── OnboardingTour.tsx       5-step guided first-run tour with localStorage persistence
│   ├── CollaboratorPanel.tsx    Right sidebar for sharing and online user presence
│   ├── BudgetPanel.tsx          Budget summary and per-category cost tracking
│   ├── App.tsx                  App shell + top nav
│   └── main.tsx                 React root + QueryClientProvider

supabase/migrations/
├── 001_initial_schema.sql       Tables, indexes, RLS policies, triggers
├── 002_seed_default_tasks.sql   seed_default_tasks() + trg_seed_default_tasks
├── 003_rpc_find_wedding.sql     find_wedding_by_code() RPC for join-by-code ⚠️ PENDING IN SUPABASE
└── 004_add_cost_columns.sql     estimated_cost / actual_cost columns on tasks ⚠️ PENDING IN SUPABASE
```

### Key design decisions
- **Comments join is manual**: `comments.user_id` → `auth.users` is not reachable via PostgREST. `useComments` fetches comments then fetches matching profiles by ID and merges them client-side. Same pattern for `useActivity`.
- **Optimistic updates**: `useUpdateTask` writes to the React Query cache instantly on mutation start; reverts on error, re-fetches on settle.
- **Auto-seed trigger**: `trg_seed_default_tasks` fires AFTER INSERT on `weddings` and calls `seed_default_tasks()` which inserts 13 category tasks and ~72 subtasks with priorities and relative due dates.
- **`_prevTask` pattern**: `useUpdateTask` accepts optional `_prevTask?: Task` (destructured out before `...updates` spread so it never reaches the DB) for use in `onSuccess` to compare changed fields and log activity.
- **Controlled cost inputs**: Cost fields in `TaskDetailDrawer` use `localEstimated`/`localActual` state synced via `useEffect` on `task?.id` change — prevents stale values after realtime updates (uncontrolled `defaultValue` does not re-render on prop change).

## 5. Current State (as of 2026-05-07)

**Core Features (Fully Implemented):**
- Full database schema with RLS (migration 001)
- Auto-seed of ~85 default tasks on wedding creation (migration 002)
- Auth flow: sign up (with display name) + sign in
- Onboarding: create new wedding or join via share code
- Dashboard screen: countdown, overall progress, per-category progress, urgent tasks list (click opens task drawer)
- Task Board: category sidebar with progress, expandable task cards, subtask rows with inline checkbox + drawer link, Realtime sync
- Task Detail Drawer: edit title/description (onBlur), change status/priority/due date (immediate), comments with realtime subscription, activity log
- **Delete task** — in-place confirmation in drawer (`confirmingDelete` state → "Confirm / Cancel" buttons), DB cascade deletes subtasks
- **Edit wedding settings** — `WeddingSettingsPanel` right-panel drawer for updating wedding name and date
- Top nav: wedding name, tab switcher, countdown chip, share code copy, sign out
- Collaborator Panel: show online users, share code, manage wedding members
- Budget Panel: budget tracker with per-category cost summaries, dark mode support

**Polish Features (Fully Implemented):**
1. **Empty States** — Illustrated empty states in every list, panel, and category
2. **Optimistic UI** — Instant visual feedback on task edits via React Query `onMutate`/`onError`/`onSettled`
3. **Toast Notifications** — Auto-dismiss success/error toasts (3s), fixed bottom-right container
4. **Keyboard Shortcuts** — `N` = new task, `/` = focus search, `Escape` = close drawer, `Enter` = save
5. **Print/Export to PDF** — Full-screen checklist preview by category; browser print dialog
6. **Onboarding Tour** — 5-step guided first-run tour (localStorage persistence, one-time per browser)
7. **Dark Mode Toggle** — Persistent dark mode (localStorage); covers all panels including Drawer, Budget, Heatmap, Settings
8. **HeatmapView** — 3-month calendar with color-coded priority dots per day, clickable tasks open drawer
9. **Activity Log** — Client-side logging in `useUpdateTask.onSuccess`; tracks status, priority, title, description, due date changes
10. **Full i18n (en/fr/he)** — All components fully translated; no hardcoded English strings (except OnboardingTour — see Known Limitations)

**Build Status:**
- Clean TypeScript build: 0 errors
- `npm run build` succeeds (pre-existing bundle size warning only)
- All features functional end-to-end

## 6. Open Issues / Bugs

**Pending User Actions (DB Migrations):**
- `003_rpc_find_wedding.sql` and `004_add_cost_columns.sql` must be run manually in Supabase Dashboard → SQL Editor
- Supabase Site URL must have `https://` prefix added: `https://wedding-planner-five-drab.vercel.app`

**Known Limitations:**
- **OnboardingTour not translated** — all 5 tour step strings are hardcoded English. Lower priority as it's a one-time first-run experience.
- TypeScript 6.0.2 + Supabase JS v2 incompatibility — workaround: cast `supabase.from('table')` to `any` when type inference breaks.
- No error UI if Supabase env vars are missing (app silently fails to load).
- Comments tab scroll: on very long comment lists the "Write a comment" form can be pushed off-screen.
- Activity log status values (todo/in_progress/done) are shown as raw DB enum strings since they come from the DB rather than being translated.

**Previously Resolved:**
- ~~RLS violation on `weddings` table~~ — resolved with corrected policies
- ~~Sidebar missing on desktop~~ — fixed with `max-md:ltr:` / `max-md:rtl:` CSS specificity fix
- ~~Dark mode panels entirely white~~ — full dark mode added to TaskDetailDrawer, BudgetPanel, WeddingSettingsPanel, HeatmapView
- ~~Month names always English in HeatmapView~~ — locale-aware formatting added
- ~~Priority labels not translated~~ — `p1Label`–`p5Label` added to translations, used everywhere
- ~~Cost inputs stale after realtime update~~ — controlled inputs with `useEffect` sync
- ~~Urgent task click in Dashboard didn't navigate~~ — fixed to call `openDrawer(task.id)`
- ~~CollaboratorPanel hardcoded English~~ — fully translated
- ~~PrintView hardcoded English~~ — fully translated
- ~~`relativeTime()` / `actionSummary()` always English~~ — moved inside component, use translation keys

## 7. TODO / Next Steps

**Pending Infrastructure (User must action):**
1. Run `003_rpc_find_wedding.sql` in Supabase SQL Editor
2. Run `004_add_cost_columns.sql` in Supabase SQL Editor
3. Fix Supabase Site URL (add `https://` prefix) in project settings
4. Push latest code to GitHub to trigger Vercel redeploy

**Medium Priority (Enhancements):**
5. **Translate OnboardingTour** — 5 step titles/body strings need `en`/`fr`/`he` entries in `translations.ts`
6. **Drag-and-drop reordering** — reorder subtasks within a category using `display_order`; consider `@dnd-kit/core`
7. **Comments scroll fix** — sticky bottom form on long comment lists
8. **Error UI** — graceful error message if Supabase env vars are missing
9. **Email confirmation handling** — handle Supabase email verification flow
10. **Mobile polish** — full-width drawer on small screens, test on real devices
11. **User avatar upload** — profile photos for collaborator list

## 8. Implementation Notes

### Toast Notifications
- **Location:** `src/hooks/useToast.ts` (Zustand store) + `src/components/ToastContainer.tsx`
- **Pattern:** Store holds array of `{ id, message, kind }`. Each toast auto-dismisses after 3 seconds via `setTimeout`.
- **Usage:** `useToast().success(msg)` or `useToast().error(msg)` from any component.

### Dark Mode
- **Location:** Tailwind config (`darkMode: 'class'`), `src/index.css` (dark mode body styles), `src/store/uiStore.ts`
- **Pattern:** `document.documentElement.classList.toggle('dark', enabled)` syncs Tailwind's dark class. Persisted to `weddingPlanner:darkMode`.
- **Coverage:** All panels — TaskDetailDrawer, BudgetPanel, HeatmapView, WeddingSettingsPanel, CollaboratorPanel.

### Keyboard Shortcuts
- **Locations:** `TaskBoardScreen.tsx` (N, /), `TaskDetailDrawer.tsx` (Escape, Enter on title)
- **Implementation:** `window.addEventListener('keydown')` in `useEffect`; check component state before acting.

### Print/Export
- **Location:** `src/components/PrintView.tsx` + `src/index.css` (`@media print` block)
- **Pattern:** `window.print()` → browser PDF dialog. `@media print` hides app chrome, shows `#print-content`.

### Activity Logging
- **Location:** `src/hooks/useTasks.ts` — `logActivity()` helper + `useUpdateTask.onSuccess`
- **Tracked fields:** status, priority, title, description, due_date
- **Pattern:** `_prevTask` passed to mutation, destructured before DB spread, compared in `onSuccess` to build change record.

### Delete Task
- **Location:** `TaskDetailDrawer.tsx` — `confirmingDelete` state, `useDeleteTask` hook
- **DB:** `supabase.from('tasks').delete().eq('id', id)` — ON DELETE CASCADE on `parent_task_id` auto-deletes subtasks.

### i18n Translation Sections
```
tr.auth          — AuthScreen
tr.onboarding    — OnboardingScreen
tr.dashboard     — DashboardScreen
tr.board         — TaskBoardScreen
tr.drawer        — TaskDetailDrawer (incl. p1Label–p5Label, timeAgo*, act*)
tr.collaborator  — CollaboratorPanel
tr.budget        — BudgetPanel
tr.settings      — WeddingSettingsPanel
tr.heatmap       — HeatmapView
tr.print         — PrintView
```

## 9. Configuration & Deployment Notes

- Supabase project URL and anon key live in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Not committed.
- SQL migrations 001 and 002 have been applied. Migrations 003 and 004 are pending.
- The share code is an 8-character uppercase hex string auto-generated by PostgreSQL (`md5(random())`).
- Priority scale: 1 = Very Low, 2 = Low, 3 = Medium, 4 = High, 5 = Critical.
- `SECURITY DEFINER` on the seed trigger function is intentional and load-bearing — do not remove it.
- **Build command:** `npm run build` → Vite outputs to `dist/`
- **Dev command:** `npm run dev` → Vite dev server on `http://localhost:5173`
- **Deployed to:** Vercel (auto-deploy from GitHub main branch)
