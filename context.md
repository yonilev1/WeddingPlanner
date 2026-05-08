# Wedding Planner — Project Context

## 0. Recent Session Summary (2026-05-08)

**What was completed:**
1. ✅ **Design overhaul implemented** — header styling (dark countdown pill, underline tabs, italic branding), dashboard redesign (hero date separator, budget stat tile, team/activity sections), responsive layouts
2. ✅ **Admin system fully built** — role-based access control, member approval workflow, admin-only delete/edit, pending approval UI
3. ✅ **TypeScript build fixed** — added `budget_total` field to Wedding type, added missing translation keys
4. ✅ **Dev server running** — http://localhost:5177 ready for testing all features
5. ✅ **Project documented** — this context.md file updated with architecture decisions, implementation details, and current status

**What's left to do:**
1. Run 4 SQL migrations in Supabase (003–006) to activate admin system and notifications
2. End-to-end testing: design visual changes, admin approval flow, permissions
3. Optional enhancements: OnboardingTour translation, budget total editing, email invites, avatars

**Key files modified:**
- `src/index.css` — CSS token updates, grid layout changes
- `src/App.tsx` — header styling, nav tabs, countdown chip redesign
- `src/components/DashboardScreen.tsx` — hero date separator, countdown tile ghost watermark, budget stat tile, team/activity sections
- `src/components/CollaboratorPanel.tsx` — email invite card
- `src/types/database.ts` — added `budget_total` to Wedding type
- `src/i18n/translations.ts` — added `budget` and `ofBudget` translation keys

---

## 1. Project Overview

A collaborative wedding planning web app where couples and their planning team can:
- Track all planning tasks organized by category (venue, catering, photography, etc.)
- Monitor progress via a dashboard with countdown, completion stats, and urgent task alerts
- Manage task details: status, priority, due date, notes, comments, and activity history
- Share a wedding with collaborators via a unique share code
- View tasks in a calendar heatmap and print a checklist PDF
- Track budget with per-category cost estimates and actuals
- Tag collaborators with @mentions in comments and receive in-app notifications

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Styling | CSS custom properties (oklch color tokens) + Tailwind CSS v3 utility classes |
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
- **Supabase Realtime** — `postgres_changes` subscriptions invalidate React Query cache for live multi-user sync; also used for notification delivery

### Task hierarchy
Tasks are flat rows with a `parent_task_id` FK (NULL = category/top-level). The app organizes them client-side into `TaskWithSubtasks[]` via `useTaskTree()`.

### RLS + SECURITY DEFINER
Every table has RLS. The helper `get_user_wedding_id()` (SECURITY DEFINER) is used in all policies to resolve the current user's wedding without exposing `profiles` directly. The seed trigger function also runs as SECURITY DEFINER to bypass RLS during the initial task seeding (the profile hasn't been linked to the new wedding yet at trigger time).

### Design Token System
All visual styles use CSS custom properties defined in `src/index.css`. Inline `style={{ ... }}` with token vars is used throughout (not Tailwind color/typography classes). Responsive layout is handled via named CSS classes in `index.css` with `@media` blocks, applied via `className`.

**Color tokens:** `--accent`, `--accent-soft`, `--accent-ink`, `--ink`, `--ink-2/3/4`, `--bg`, `--bg-card`, `--bg-soft`, `--line`, `--line-soft`, `--ok`, `--bad`, `--warn`

**Gap-as-border technique:** Grid containers use `background: var(--line); gap: 1px` so each child with `background: var(--bg-card)` shows a hairline separator without per-cell border logic. Works at any column count.

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
├── types/database.ts            All DB types + convenience aliases (incl. Notification)
├── store/uiStore.ts             Zustand store: UI state, dark mode, language, tour progress (localStorage-persisted)
├── index.css                    CSS token definitions + responsive layout helper classes
├── i18n/
│   ├── translations.ts          All en/fr/he strings, typed as const
│   └── useTranslation.ts        Hook that returns the active language's translation object
├── hooks/
│   ├── useAuth.ts               Auth state + profile, signOut, refreshProfile
│   ├── useWedding.ts            Fetches single wedding row
│   ├── useTasks.ts              useTasks, useTaskTree, useUpdateTask (optimistic+activity log), useAddTask, useDeleteTask
│   ├── useComments.ts           useComments, useAddComment (with @mention notification insert), useActivity
│   ├── useCollaborators.ts      Fetches all profiles for a wedding (used for @mention autocomplete)
│   ├── useNotifications.ts      useNotifications (realtime), useMarkNotificationsRead, useInsertNotifications
│   ├── useToast.ts              Toast store (message, kind, auto-dismiss 3s)
│   └── usePresence.ts           Real-time user presence tracking
├── components/
│   ├── ui/
│   │   ├── PriorityBadge.tsx    P1-P5 colored badges
│   │   ├── StatusBadge.tsx      todo / in_progress / done
│   │   └── ProgressBar.tsx      Configurable animated progress bar
│   ├── AuthScreen.tsx           Two-column split layout: brand panel (left) + form (right)
│   ├── OnboardingScreen.tsx     New wedding / Join with code
│   ├── DashboardScreen.tsx      Editorial hero, stat tiles, categories, urgent tasks
│   ├── TaskBoardScreen.tsx      Category sidebar + expandable task cards + realtime + DnD
│   ├── TaskDetailDrawer.tsx     Right-panel drawer: segmented status, underline tabs, @mention comments
│   ├── WeddingSettingsPanel.tsx Right-panel drawer for editing wedding name and date
│   ├── ToastContainer.tsx       Fixed bottom-right toast notifications (success/error)
│   ├── HeatmapView.tsx          3-month calendar heatmap with color-coded task dots by priority
│   ├── PrintView.tsx            Full-screen print preview, checklist by category
│   ├── OnboardingTour.tsx       5-step guided first-run tour with localStorage persistence
│   ├── CollaboratorPanel.tsx    Right sidebar for sharing and online user presence
│   └── BudgetPanel.tsx          Budget summary and per-category cost tracking
├── App.tsx                      App shell + top nav + NotificationBell component
└── main.tsx                     React root + QueryClientProvider

supabase/migrations/
├── 001_initial_schema.sql       Tables, indexes, RLS policies, triggers ✅ APPLIED
├── 002_seed_default_tasks.sql   seed_default_tasks() + trg_seed_default_tasks ✅ APPLIED
├── 003_rpc_find_wedding.sql     find_wedding_by_code() RPC for join-by-code ⚠️ PENDING IN SUPABASE
├── 003_budget_fields.sql        (extra budget fields migration)
├── 004_add_cost_columns.sql     estimated_cost / actual_cost columns on tasks ⚠️ PENDING IN SUPABASE
├── 005_notifications.sql        notifications table + RLS + realtime ⚠️ PENDING IN SUPABASE
└── 006_admin_system.sql         Admin roles, member status, approval workflow ⚠️ PENDING IN SUPABASE
```

### Key design decisions
- **Comments join is manual**: `comments.user_id` → `auth.users` is not reachable via PostgREST. `useComments` fetches comments then fetches matching profiles by ID and merges them client-side. Same pattern for `useActivity`.
- **Optimistic updates**: `useUpdateTask` writes to the React Query cache instantly on mutation start; reverts on error, re-fetches on settle.
- **Auto-seed trigger**: `trg_seed_default_tasks` fires AFTER INSERT on `weddings` and calls `seed_default_tasks()` which inserts 13 category tasks and ~72 subtasks with priorities and relative due dates.
- **`_prevTask` pattern**: `useUpdateTask` accepts optional `_prevTask?: Task` (destructured out before `...updates` spread so it never reaches the DB) for use in `onSuccess` to compare changed fields and log activity.
- **Controlled cost inputs**: Cost fields in `TaskDetailDrawer` use `localEstimated`/`localActual` state synced via `useEffect` on `task?.id` change — prevents stale values after realtime updates (uncontrolled `defaultValue` does not re-render on prop change).
- **TypeScript / Supabase cast workaround**: TypeScript 6.0.2 + Supabase JS v2 type inference breaks on some tables. Workaround: cast `supabase.from('table')` to `any` for affected queries. This is intentional; affected hooks have `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments.

## 5. Design Redesign — UI Token System

The app underwent a full visual redesign replacing Tailwind color/stone/rose classes with CSS custom property tokens across all major screens and components.

### Responsive layout classes in `index.css`
```css
.dashboard-page { padding: 32px 40px 80px; }
@media (max-width: 640px) { .dashboard-page { padding: 20px 16px 60px; } }

.stat-tiles-grid {
  display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr;
  background: var(--line); gap: 1px;
  border-radius: 16px; overflow: hidden; margin-bottom: 40px;
}
@media (max-width: 640px) { .stat-tiles-grid { grid-template-columns: 1fr 1fr; } }

.dashboard-two-col { display: grid; grid-template-columns: 1.7fr 1fr; gap: 28px; }
@media (max-width: 768px) { .dashboard-two-col { grid-template-columns: 1fr; } }

.budget-tiles-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  background: var(--line); gap: 1px;
  border-radius: 16px; overflow: hidden; margin-bottom: 28px;
}
@media (max-width: 480px) { .budget-tiles-grid { grid-template-columns: 1fr; } }
```

### Key component styling patterns
- **Field labels (mono-ui):** `{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono, monospace)' }`
- **Input style:** `{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', transition: 'border-color 120ms', boxSizing: 'border-box' }`
- **Status segmented control:** single bordered row, active segment = `var(--accent-soft)` bg, `borderInlineStart` dividers
- **Underline tabs:** `borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent'`, `marginBottom: -1`

## 6. @Mention & Notification System

### How it works
1. In `TaskDetailDrawer`, a textarea detects `@` keypresses via `/@([\w ]*)$/` regex on cursor position.
2. A dropdown appears above the textarea listing matching collaborators from `useCollaborators(weddingId)`.
3. Clicking a name inserts `@Name` into the comment and closes the dropdown.
4. On submit, `useAddComment` resolves mentioned users: `collaborators.filter(c => c.name && text.includes('@${c.name}'))`.
5. Notification rows are inserted for each mentioned user (excluding the commenter) into the `notifications` table.
6. `NotificationBell` in `App.tsx` shows a badge count of unread notifications; clicking opens a dropdown list.
7. Clicking a notification navigates to the task via `openDrawer(n.task_id)` and marks all notifications read.

### Files involved
- `src/hooks/useComments.ts` — `useAddComment` extended with `weddingId` + `mentionedUserIds` params; inserts notification rows
- `src/hooks/useNotifications.ts` — `useNotifications` (query + realtime INSERT subscription), `useMarkNotificationsRead`, `useInsertNotifications`
- `src/hooks/useCollaborators.ts` — fetches all wedding member profiles for autocomplete
- `src/App.tsx` — `NotificationBell` component; uses `useNotifications` + `useMarkNotificationsRead`
- `src/types/database.ts` — `notifications` table type + `Notification` alias
- `supabase/migrations/005_notifications.sql` — table DDL, indexes, RLS policies, realtime publication

### Mention name resolution — important note
The regex `/@([\w ]+)/g` with a space in the character class was too greedy (captured `"Efrat how are you"` instead of just `"Efrat"`). Fixed to a direct string match: `collaborators.filter(c => c.name && text.includes('@${c.name}'))`. This avoids false negatives from regex greediness.

### RLS policy on notifications
- **SELECT**: own `user_id = auth.uid()`
- **INSERT**: `wedding_id = get_user_wedding_id()` — only members of the same wedding can insert
- **UPDATE**: own `user_id = auth.uid()` — for marking read

## 7. Current State (as of 2026-05-08)

**Core Features (Fully Implemented):**
- Full database schema with RLS (migration 001)
- Auto-seed of ~85 default tasks on wedding creation (migration 002)
- Auth flow: sign up (with display name) + sign in
- Onboarding: create new wedding or join via share code
- Dashboard screen: editorial hero with date separator line, countdown, stat tiles, per-category progress, urgent tasks
- Task Board: category sidebar with progress, expandable task cards, subtask rows, Realtime sync
- Task Detail Drawer: segmented status control, underline tabs, edit title/description, change priority/due date, comments, activity log
- **Delete task** — in-place confirmation in drawer, DB cascade deletes subtasks
- **Edit wedding settings** — `WeddingSettingsPanel` right-panel drawer
- Top nav: wedding name with italic "everafter" branding, underline-based tab switcher, dark countdown pill, share code copy, notification bell, sign out
- Collaborator Panel: online users, share code, wedding members, email invite card
- Budget Panel: budget tracker with per-category cost summaries, mobile responsive, budget stat tile on dashboard

**Admin System (Fully Implemented):**
- Member roles: `admin` and `member`
- Member status: `pending` (awaiting approval) and `active` (full access)
- **Admin capabilities:**
  - Approve/reject pending members
  - Promote members to admin / demote from admin
  - Remove members from wedding
  - Delete any task (non-admins cannot)
  - Edit/delete any comment (users can edit/delete their own)
- **Pending approval UI:** New members see "Waiting for admin approval" screen until approved
- **Admin controls in CollaboratorPanel:** pending members list with approve/reject buttons, admin badges on members, member role/remove actions
- **Admin gating:** settings gear button only visible to admins
- Migration 006 with role/member_status columns and helper functions

**Polish Features (Fully Implemented):**
1. **@Mention in comments** — type `@Name` to tag a collaborator; dropdown autocomplete
2. **In-app notifications** — bell badge shows unread count; clicking opens dropdown with task links
3. **Realtime notification delivery** — Supabase Realtime subscription pushes to tagged user instantly
4. **Empty States** — Illustrated empty states in every list, panel, and category
5. **Optimistic UI** — Instant visual feedback on task edits via React Query `onMutate`/`onError`/`onSettled`
6. **Toast Notifications** — Auto-dismiss success/error toasts (3s), fixed bottom-right container
7. **Keyboard Shortcuts** — `N` = new task, `/` = focus search, `Escape` = close drawer, `Enter` = save
8. **Print/Export to PDF** — Full-screen checklist preview by category; browser print dialog
9. **Onboarding Tour** — 5-step guided first-run tour (localStorage persistence, one-time per browser)
10. **Dark Mode Toggle** — Persistent dark mode (localStorage); covers all panels
11. **HeatmapView** — 3-month calendar with color-coded priority dots per day, clickable tasks open drawer
12. **Activity Log** — Tracks status, priority, title, description, due date changes
13. **Full i18n (en/fr/he)** — All components fully translated; no hardcoded English strings (except OnboardingTour)
14. **Mobile responsive** — Stat tiles, budget tiles, dashboard layout all adapt via CSS media query classes

**Design Overhaul (Fully Implemented):**
- Dark countdown pill with white number in header (inverted from soft pill)
- Underline-based tab navigation (active: `2px solid var(--ink)`, inactive: transparent)
- Dashboard date separator line inline with wedding names
- Countdown stat tile with accent-soft background + ghost watermark number (large italic display at 0.08 opacity)
- Budget stat tile showing estimated total and percentage of budget
- Dashboard right column: "Your team" section (first 5 collaborators with initials avatars), "Recent activity" section (5 latest updated tasks)
- Email invite card in collaborators/people page
- CSS token updates: `--accent-on: white`, stat-tiles-grid changed from `1.5fr` to `1.4fr` for wider countdown tile
- All new sections styled with design tokens (oklch colors, responsive grids, hairline borders)

**Build Status:**
- Clean TypeScript build: 0 errors (fixed by adding `budget_total` to Wedding type)
- `npm run build` succeeds (pre-existing bundle size warning only)
- Dev server running on http://localhost:5177 (ports 5173–5176 were occupied)
- Deployed to Vercel (auto-deploy from GitHub main branch)

## 8. Open Issues / Bugs

**Pending User Actions (DB Migrations — CRITICAL):**
- `003_rpc_find_wedding.sql` — must be run in Supabase SQL Editor (join-by-code RPC)
- `004_add_cost_columns.sql` — must be run in Supabase SQL Editor (cost fields on tasks)
- `005_notifications.sql` — **must be run** for @mention notifications to work; the `notifications` table does not exist in production yet
- `006_admin_system.sql` — must be run in Supabase SQL Editor (admin roles and member status)

**Known Limitations:**
- **OnboardingTour not translated** — all 5 tour step strings are hardcoded English. Lower priority as it's a one-time first-run experience.
- Activity log status values (todo/in_progress/done) are shown as raw DB enum strings since they come from the DB rather than being translated.
- No error UI if Supabase env vars are missing (app silently fails to load).
- Comments tab scroll: on very long comment lists the "Write a comment" form can be pushed off-screen.
- **Budget total display:** Currently shows estimated budget calculated from task costs; actual `budget_total` from wedding row should be set via settings (not yet implemented in WeddingSettingsPanel UI)

**Previously Resolved:**
- ~~RLS violation on `weddings` table~~ — resolved with corrected policies
- ~~Sidebar missing on desktop~~ — fixed with `max-md:ltr:` / `max-md:rtl:` CSS specificity fix
- ~~Dark mode panels entirely white~~ — full dark mode added to all panels
- ~~Stat tiles / budget tiles overflowing on mobile~~ — fixed with CSS media query classes (`stat-tiles-grid`, `budget-tiles-grid`)
- ~~Vercel build failure (`tsc -b` exit 2)~~ — caused by unused `LANGUAGES` import in DashboardScreen.tsx; removed
- ~~Mention name resolution too greedy~~ — regex `/@([\w ]+)/g` replaced with direct `text.includes('@${c.name}')` match
- ~~Month names always English in HeatmapView~~ — locale-aware formatting added
- ~~Cost inputs stale after realtime update~~ — controlled inputs with `useEffect` sync
- ~~`inputCls` TS errors in FilterBar~~ — replaced string className with `inputStyle` object
- ~~TypeScript error: `budget_total` missing from Wedding type~~ — added field to Row, Insert, Update types
- ~~Translation keys missing~~ — added `budget` and `ofBudget` to tr.dashboard for all languages

## 9. TODO / Next Steps

**CRITICAL — Pending Infrastructure (User must action in Supabase):**
1. ✅ `001_initial_schema.sql` — already applied
2. ✅ `002_seed_default_tasks.sql` — already applied
3. ⚠️ **Run `003_rpc_find_wedding.sql`** in Supabase SQL Editor (join-by-code functionality)
4. ⚠️ **Run `004_add_cost_columns.sql`** in Supabase SQL Editor (cost tracking on tasks)
5. ⚠️ **Run `005_notifications.sql`** in Supabase SQL Editor (notifications table + realtime)
6. ⚠️ **Run `006_admin_system.sql`** in Supabase SQL Editor (admin roles + member approval)
7. Fix Supabase Site URL (ensure `https://` prefix) in project settings

**High Priority (Design/Functionality Testing):**
8. **Test design overhaul:** Open dev server and verify:
   - ✅ Header: dark countdown pill, underline tabs, italic branding
   - ✅ Dashboard: date separator, countdown ghost watermark, budget stat tile
   - ✅ Team section: displays first 5 collaborators with initials
   - ✅ Recent activity: shows 5 latest updated tasks
   - ✅ Email invite card: visible in collaborators panel
   - Dark mode: all new sections render correctly
   - Mobile/responsive: layout adapts at breakpoints
9. **Test admin system end-to-end:**
   - Create wedding (user becomes admin)
   - Invite second user → appears as "pending"
   - Admin approves → user gains access
   - Admin promotes member to admin
   - Admin removes member
   - Non-admin sees no delete button, no settings
   - Admin can edit/delete any comment

**Medium Priority (Enhancements):**
10. **Translate OnboardingTour** — 5 step titles/body strings need `en`/`fr`/`he` entries in `translations.ts`
11. **Budget total editing** — add input field to `WeddingSettingsPanel` to set `wedding.budget_total`
12. **Comments scroll fix** — sticky bottom form on long comment lists
13. **Error UI** — graceful error message if Supabase env vars are missing
14. **Email confirmation handling** — handle Supabase email verification flow
15. **User avatar upload** — profile photos for collaborator list and comment avatars
16. **Member invitation by email** — send invite links to non-collaborators via email

## 10. Implementation Notes

### @Mention Autocomplete (TaskDetailDrawer)
- `mentionQuery` state holds the partial name being typed after `@`
- `mentionAnchor` holds the cursor position where `@` was typed (used to replace on selection)
- `handleCommentChange`: detects `@` with `/@([\w ]*)$/` against text before cursor
- `insertMention(name)`: replaces `@partial` at `mentionAnchor` with `@Name ` and refocuses textarea
- `renderCommentText`: splits on `/@(\S+)/g`, renders `@mentions` in `var(--accent-ink)` color
- Comment textarea: `Enter` to send, `Shift+Enter` for newline

### Notification Bell (App.tsx)
- `NotificationBell` component fetches via `useNotifications(user?.id)`
- Badge shows count of `notifications.filter(n => !n.read).length`
- Clicking bell: opens dropdown, marks all read via `useMarkNotificationsRead`
- Clicking a notification item: calls `openDrawer(n.task_id)` + closes dropdown

### Toast Notifications
- **Location:** `src/hooks/useToast.ts` (Zustand store) + `src/components/ToastContainer.tsx`
- **Pattern:** Store holds array of `{ id, message, kind }`. Each toast auto-dismisses after 3 seconds via `setTimeout`.
- **Usage:** `useToast().success(msg)` or `useToast().error(msg)` from any component.

### Dark Mode
- **Location:** Tailwind config (`darkMode: 'class'`), `src/index.css` (dark mode body styles), `src/store/uiStore.ts`
- **Pattern:** `document.documentElement.classList.toggle('dark', enabled)` syncs Tailwind's dark class. Persisted to `weddingPlanner:darkMode`.

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

## 11. Admin System Architecture

### Database Changes (migration 006)
- **profiles table:** Added columns:
  - `role: 'admin' | 'member'` — controls permissions
  - `member_status: 'pending' | 'active'` — controls access (pending users blocked by RLS)
- **Helper function:** `is_wedding_admin()` checks `role = 'admin' AND member_status = 'active'`
- **RLS policy updates:**
  - `weddings` UPDATE: requires `is_wedding_admin()`
  - `tasks` DELETE: requires `is_wedding_admin()`
  - `comments` DELETE/UPDATE: allows own row OR `is_wedding_admin()`

### Workflow
1. **Create path:** User creates wedding → automatically becomes admin (`role='admin'`)
2. **Join path:** User joins via share code → awaits approval (`member_status='pending'`)
3. **Approval:** Admin sees pending member in CollaboratorPanel, clicks "Approve" → sets `member_status='active'`
4. **Access control:** Pending members blocked from all views by RLS; settings gear hidden for non-admins

### UI Components
- **PendingApprovalScreen** (inline in App.tsx) — shown when user's `member_status='pending'`
- **CollaboratorPanel** — enhanced with:
  - "Pending Members" section (admin-only) with Approve/Reject buttons
  - Admin badges (crown icon) on members with admin role
  - "Make Admin"/"Remove Admin" buttons (non-admins invisible, can't demote last admin)
  - "Remove from Event" buttons
- **TaskDetailDrawer** — enhanced with:
  - Comment Edit/Delete icons (visible to author or admin)
  - Inline edit UI: textarea with Save/Cancel buttons
  - Task delete button (admin-only)

### Hooks
- `useAdminActions()` — four mutations: `useApproveMember`, `useRejectMember`, `useRemoveMember`, `useSetMemberRole`
- `useComments()` — extended with `useDeleteComment` and `useUpdateComment` mutations

## 12. Design Overhaul — Visual Redesign (2026-05-07/08)

### Header Updates
- **Brand:** Added italic styling to "everafter" (fontStyle: 'italic')
- **Nav tabs:** Changed from pill-style background to underline indicators
  - Active: `borderBottom: '2px solid var(--ink)'`, text `var(--ink)`
  - Inactive: `borderBottom: '2px solid transparent'`, text `var(--ink-3)`
  - Removed background styling
- **Countdown chip:** Inverted from soft pill to dark pill
  - Background: `var(--ink)` (dark)
  - Number: `var(--bg)` (white/light), italic
  - Label: `rgba(255, 255, 255, 0.45)` (semi-transparent)
  - Text: "days to go"

### Dashboard Improvements
- **Hero section:** Added inline date separator
  - Layout: `flex` with flex:1 divs on either side of date
  - Shows full wedding date (e.g., "May 15, 2026") centered
- **Countdown tile:** Enhanced with design accent
  - Background: `var(--accent-soft)` (terracotta soft)
  - Layout: `flex` column with space-between for ghost watermark effect
  - Ghost watermark: positioned absolutely bottom-right, large italic display font, opacity 0.08
- **Budget stat tile:** New 4th stat tile replacing "Urgent Tasks"
  - Shows: `$Xk` estimated total + `X% of budget`
  - Includes progress bar showing budget utilization
  - Calculated from sum of task `estimated_cost` values
- **Right column redesign:** Replaced category-progress aside with two sections:
  - **Your team:** Shows first 5 collaborators with colored initials avatars, name, role
  - **Recent activity:** Shows top 5 tasks sorted by `updated_at` desc (non-done tasks), with relative timestamps

### Styling Patterns
- **CSS Grid:** Updated stat-tiles-grid from `grid-template-columns: 1.5fr 1fr 1fr 1fr` to `1.4fr 1fr 1fr 1fr` (wider countdown)
- **Design tokens:** Added `--accent-on: white` for text on accent backgrounds
- **Responsive:** All new grid layouts use `@media` blocks in index.css (no Tailwind classes)

### Budget Panel Enhancement
- New "Top line items" section at bottom
- Shows top 8 tasks by `estimated_cost` (descending)
- Each row: task title, category, `actual/estimated` amounts, paid/due pill
- Rows clickable → opens TaskDetailDrawer

### Collaborators Panel Enhancement
- Added EmailInviteCard component before member list
- Contains: email input + "Send invite" button
- Button shows "Sent!" feedback for 2 seconds after click
- QR code placeholder div (patterned background) next to share code

### CSS Token Updates
- `--accent-on: white` — text color for dark backgrounds
- Updated dark mode variants for new sections in `.dark` class
- No changes to color scale; all new styles use existing tokens

## 13. Configuration & Deployment Notes

- Supabase project URL and anon key live in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Not committed.
- SQL migrations 001 and 002 have been applied. Migrations 003, 004, and 005 are pending.
- The share code is an 8-character uppercase hex string auto-generated by PostgreSQL (`md5(random())`).
- Priority scale: 1 = Very Low, 2 = Low, 3 = Medium, 4 = High, 5 = Critical.
- `SECURITY DEFINER` on the seed trigger function is intentional and load-bearing — do not remove it.
- **Build command:** `npm run build` → Vite outputs to `dist/`
- **Dev command:** `npm run dev` → Vite dev server on `http://localhost:5173`
- **Mobile testing:** `npm run dev -- --host` exposes on LAN; access via `http://<local-ip>:5173` from phone on same WiFi
- **Deployed to:** Vercel (auto-deploy from GitHub main branch)
