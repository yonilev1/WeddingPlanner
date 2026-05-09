# Wedding Planner — Project Context

## 0. Recent Session Summary (2026-05-09)

**What was completed this session:**
1. ✅ **Guest List & RSVP Tracker** — full screen with stats tiles, filter pills, search, table view, add/edit modal, bulk import with couple auto-detection and per-row toggle
2. ✅ **Vendor Directory** — full screen with category tabs, card grid, add/edit modal, contract/deposit tracking
3. ✅ **Task Assignment** — assignee picker in TaskDetailDrawer; `assigned_to` column on tasks table
4. ✅ **PWA / Installable App** — `vite-plugin-pwa` with SVG icons, autoUpdate service worker, NetworkFirst Supabase caching
5. ✅ **Task/Subtask Translation** — `useTaskName()` hook + `taskNames` map in translations.ts maps all 72 seeded English task titles to fr/he translations; user-created tasks fall back to raw title
6. ✅ **Bulk Guest Import** — textarea paste, per-row preview, Hebrew `ו`/English `and`/`&` couple auto-detection, 👤/👫 toggle per row, correct people count
7. ✅ **Getting Started checklist** — 5-step card on Dashboard; auto-detects completion from live data; collapses to pill (not permanently dismissed); disappears only when all 5 done; celebration banner on completion
8. ✅ **Budget tracking** — users enter estimated and actual costs per task; vendors link to tasks; BudgetPanel aggregates task + vendor costs by category with spend bars and totals
9. ✅ **Improved empty states** — Dashboard urgent tasks and recent activity show actionable prompts when empty
10. ✅ **Admin-only Delete All Guests** — with inline confirm; per-row delete requires confirm (click ×→✓/✕)

**Pending migrations (must run in Supabase SQL Editor):**
- `007_guests.sql` — guests table + RLS
- `008_vendors.sql` — vendors table + RLS
- `009_task_assignment.sql` — `assigned_to` column on tasks
- `012_vendor_task_linking.sql` — `task_id` FK on vendors for budget integration

---

## 1. Project Overview

A collaborative wedding planning web app where couples and their planning team can:
- Track all planning tasks organized by 13 categories (venue, catering, photography, etc.)
- Monitor progress via a dashboard with countdown, completion stats, and urgent task alerts
- Manage task details: status, priority, due date, notes, comments, activity history, assignee
- Share a wedding with collaborators via a unique share code
- View tasks in a calendar heatmap and print a checklist PDF
- Track budget with per-category cost estimates and actuals (seeded with realistic defaults)
- Manage a full guest list with RSVP tracking, bulk import, couple detection
- Manage vendors (photographers, caterers, etc.) with contract and deposit tracking
- Tag collaborators with @mentions in comments and receive in-app notifications
- Install as a PWA on mobile/desktop

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Styling | CSS custom properties (oklch color tokens) + Tailwind CSS v3 utility classes |
| Server state | React Query v5 (`@tanstack/react-query`) |
| Local UI state | Zustand v5 |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| DB migrations | Raw SQL in `supabase/migrations/` |
| PWA | `vite-plugin-pwa` with Workbox, autoUpdate, NetworkFirst for Supabase API |

## 3. Architecture

### Single-page conditional rendering (no router)
`App.tsx` checks auth state and renders one of four screens:
```
loading → <Spinner>
no user → <AuthScreen>
no wedding → <OnboardingScreen>
ready    → <MainApp> (active tab renders the correct screen)
```

### Navigation tabs
`MainTab = 'dashboard' | 'board' | 'budget' | 'people' | 'guests' | 'vendors'`

All tabs are rendered conditionally in App.tsx with `{activeMainTab === 'X' && <XScreen />}`.

### State layers
- **Supabase** — source of truth; all writes go straight to DB
- **React Query** — caches server data per `weddingId`/`taskId`; optimistic updates on task edits
- **Zustand (`uiStore`)** — ephemeral UI: active tab, selected category, open drawer task ID, expanded task IDs, dark mode, language, tour progress, getting-started collapsed state (localStorage-persisted where relevant)
- **Supabase Realtime** — `postgres_changes` subscriptions invalidate React Query cache for live multi-user sync; also used for notification delivery

### Task hierarchy
Tasks are flat rows with a `parent_task_id` FK (NULL = category/top-level). The app organizes them client-side into `TaskWithSubtasks[]` via `useTaskTree()`.

### Vendor-to-task linking
Vendors optionally link to a task via `task_id` FK. When set, the vendor's `total_cost` is included in the BudgetPanel's category total. Users select a task (category or subtask) when editing a vendor. This bridges the vendor and budget systems.

### RLS + SECURITY DEFINER
Every table has RLS. The helper `get_user_wedding_id()` (SECURITY DEFINER) is used in all policies to resolve the current user's wedding without exposing `profiles` directly. The seed trigger function also runs as SECURITY DEFINER to bypass RLS during the initial task seeding.

### TypeScript / Supabase cast workaround
The `guests` and `vendors` tables were added after the Supabase TypeScript types were generated. All hooks for these tables cast `supabase` to `any`:
```ts
const guestsTable = () => (supabase as any).from('guests')
```
This is intentional. When types are regenerated, these casts can be removed.

### Design Token System
All visual styles use CSS custom properties defined in `src/index.css`. Inline `style={{ ... }}` with token vars is the primary styling method.

**Color tokens:** `--accent`, `--accent-soft`, `--accent-ink`, `--ink`, `--ink-2/3/4`, `--bg`, `--bg-card`, `--bg-soft`, `--line`, `--line-soft`, `--ok`, `--bad`, `--warn`

### i18n / Translation system
All user-facing strings live in `src/i18n/translations.ts`, typed `as const`. Three languages: `en`, `fr`, `he` (Hebrew, RTL).

**Task title translation:** Seeded task titles are stored in English in the DB. `useTaskName()` hook looks up the English title in `tr.taskNames` (and `tr.categoryNames`) to return the translated version. User-created tasks fall back to the raw title. Applied in: `TaskBoardScreen`, `DashboardScreen`, `HeatmapView`, `PrintView`. Intentionally NOT applied in `TaskDetailDrawer`'s editable input (to avoid saving a translated title).

### Hebrew couple detection (bulk import)
Pattern: `/\band\b|\bund\b|\bet\b|\by\b|\boch\b|\bи\b|&|\sו[א-ת]/`
- `\sו[א-ת]` — space + `ו` immediately followed by a Hebrew letter (the prefix conjunction pattern)
- `\b` word-boundary anchors work for Latin scripts; Hebrew needs the space+letter pattern instead

## 4. Key Files & Structure

```
src/
├── lib/supabase.ts              Supabase client
├── types/database.ts            All DB types + Guest, Vendor, Notification aliases
├── store/uiStore.ts             Zustand: UI state, dark mode, language, gettingStartedCollapsed
├── index.css                    CSS token definitions + responsive layout helper classes
├── i18n/
│   ├── translations.ts          All en/fr/he strings (incl. taskNames, categoryNames, guests, vendors)
│   ├── useTranslation.ts        Hook that returns active language's translation object
│   └── useTaskName.ts           Hook: returns fn that translates seeded task titles or falls back to raw
├── hooks/
│   ├── useAuth.ts               Auth state + profile, signOut
│   ├── useWedding.ts            Fetches single wedding row
│   ├── useTasks.ts              useTaskTree, useUpdateTask (optimistic), useAddTask, useDeleteTask
│   ├── useComments.ts           useComments, useAddComment (@mention notifications), useActivity
│   ├── useCollaborators.ts      All profiles for a wedding (used for @mention autocomplete + assignee picker)
│   ├── useNotifications.ts      useNotifications (realtime), useMarkNotificationsRead
│   ├── useGuests.ts             useGuests, useAddGuest, useUpdateGuest, useDeleteGuest, useDeleteAllGuests, useBulkAddGuests
│   ├── useVendors.ts            useVendors, useAddVendor, useUpdateVendor, useDeleteVendor
│   ├── useAdminActions.ts       useApproveMember, useRejectMember, useRemoveMember, useSetMemberRole
│   ├── useToast.ts              Toast store (success/error, auto-dismiss 3s)
│   └── usePresence.ts           Real-time user presence tracking
├── components/
│   ├── ui/
│   │   ├── PriorityBadge.tsx    P1-P5 colored badges
│   │   ├── StatusBadge.tsx      todo / in_progress / done
│   │   └── ProgressBar.tsx      Animated progress bar
│   ├── AuthScreen.tsx           Sign up / sign in
│   ├── OnboardingScreen.tsx     New wedding / Join with code / Pending approval
│   ├── DashboardScreen.tsx      Hero, stat tiles, getting-started checklist, urgent tasks, team, activity
│   ├── TaskBoardScreen.tsx      Category sidebar + expandable task cards + DnD + realtime
│   ├── TaskDetailDrawer.tsx     Right-panel: status, priority, due date, assignee, budget, comments, activity
│   ├── WeddingSettingsPanel.tsx Right-panel: edit wedding name and date
│   ├── BudgetPanel.tsx          Budget summary + per-category breakdown with Share%, spend bars, totals
│   ├── GuestListScreen.tsx      Guest table, RSVP stats, bulk import modal with couple detection
│   ├── VendorScreen.tsx         Vendor cards by category, contract/deposit tracking
│   ├── HeatmapView.tsx          3-month calendar heatmap, priority-colored task dots
│   ├── PrintView.tsx            Full-screen print preview checklist
│   ├── CollaboratorPanel.tsx    Sharing, online presence, member management (admin controls)
│   ├── OnboardingTour.tsx       5-step guided first-run tour (localStorage, one-time)
│   └── ToastContainer.tsx       Fixed bottom-right auto-dismiss toasts
├── App.tsx                      Shell + nav + NotificationBell + tab routing
└── main.tsx                     React root + QueryClientProvider + PWA registration

supabase/migrations/
├── 001_initial_schema.sql       Tables, RLS, triggers ✅ APPLIED
├── 002_seed_default_tasks.sql   seed_default_tasks() + trigger ✅ APPLIED
├── 003_rpc_find_wedding.sql     find_wedding_by_code() RPC ✅ APPLIED
├── 003_budget_fields.sql        Budget fields (superseded by 004)
├── 004_add_cost_columns.sql     estimated_cost / actual_cost on tasks ✅ APPLIED
├── 005_notifications.sql        notifications table + RLS + realtime ✅ APPLIED
├── 006_admin_system.sql         role + member_status on profiles ✅ APPLIED
├── 007_guests.sql               guests table + RLS ⚠️ PENDING
├── 008_vendors.sql              vendors table + RLS ⚠️ PENDING
├── 009_task_assignment.sql      assigned_to column on tasks ⚠️ PENDING
└── 011_clear_seeded_budgets.sql Clears any seeded budget data (if any exists) ⚠️ PENDING

public/
└── icons/
    ├── icon-192.svg             PWA icon (terracotta rounded rect, italic "e")
    └── icon-512.svg             PWA icon (same, larger)
```

## 5. Database Schema (all tables)

| Table | Purpose |
|---|---|
| `weddings` | Core wedding record: name, date, share_code, budget_total |
| `profiles` | User profiles linked to a wedding: name, role (admin/member), member_status (pending/active) |
| `tasks` | All tasks + categories: title, description, parent_task_id, status, priority, due_date, estimated_cost, actual_cost, assigned_to, display_order |
| `comments` | Task comments: task_id, user_id, content, created_at |
| `activity` | Task change log: task_id, user_id, field, old_value, new_value |
| `notifications` | @mention notifications: user_id, wedding_id, task_id, message, read |
| `guests` | Wedding guests: name, email, rsvp_status, dietary, plus_one, plus_one_name, table_number, group_name, notes |
| `vendors` | Wedding vendors: name, category, contact info, contract_status, deposit_paid, costs, notes, **task_id** (FK to tasks for budget linking) |

## 6. Key Architectural Decisions

- **Comments join is manual**: `comments.user_id` → `auth.users` is not directly queryable via PostgREST. `useComments` fetches comments then fetches matching profiles by ID and merges client-side.
- **Optimistic updates**: `useUpdateTask` writes to React Query cache instantly; reverts on error.
- **Auto-seed trigger**: `trg_seed_default_tasks` fires AFTER INSERT on `weddings` and inserts 13 categories + ~72 subtasks with realistic due dates and now budget estimates.
- **`_prevTask` pattern**: `useUpdateTask` accepts optional `_prevTask?: Task` (destructured before spread so it never reaches the DB) for activity log diffing in `onSuccess`.
- **Controlled cost inputs**: Cost fields in TaskDetailDrawer use `localEstimated`/`localActual` state synced via `useEffect` on `task?.id` — prevents stale values after realtime updates.
- **Getting started collapse**: Stored in Zustand session state only (not localStorage). Resets on page refresh. Auto-disappears when all 5 steps genuinely complete from live data.
- **Budget estimates on category tasks**: `estimated_cost` is set on the parent (category) task row. `BudgetPanel` sums `[cat, ...cat.subtasks]` per category, so category-level budget and subtask-level line items coexist cleanly.
- **Duplicate key TS6.0.2 protection**: TypeScript 6.0.2 throws `TS1117` on duplicate literal keys in object literals. The `vendors` translation section uses `contractsSigned` (not `signed`) for the stat tile to avoid collision with the `signed` contract status option key.
- **Duplicate `wedding_id` spread fix**: When building insert/update payloads from a draft object that already contains `wedding_id`, destructure it out first: `const { wedding_id: _w, ...data } = draft`.

## 7. i18n Translation Sections

```
tr.auth          — AuthScreen
tr.onboarding    — OnboardingScreen
tr.nav           — Navigation tabs (incl. guests, vendors)
tr.dashboard     — DashboardScreen
tr.board         — TaskBoardScreen
tr.drawer        — TaskDetailDrawer (incl. assignedTo, unassigned, p1Label–p5Label)
tr.collaborator  — CollaboratorPanel
tr.budget        — BudgetPanel
tr.settings      — WeddingSettingsPanel
tr.heatmap       — HeatmapView
tr.print         — PrintView
tr.guests        — GuestListScreen (incl. bulk import keys)
tr.vendors       — VendorScreen
tr.admin         — Admin actions
tr.categoryNames — Category title translations (keyed by English title)
tr.taskNames     — Subtask title translations (keyed by English title, 72 entries)
```

## 8. Getting Started Checklist (DashboardScreen)

5 steps, auto-detected from live data:

| Step | Completion signal |
|---|---|
| Set wedding date | `wedding.date` exists |
| Invite partner or planner | `collaborators.length > 1` |
| Review task checklist | `stats.done > 0` (at least one task marked done) |
| Add guest list | `guests.length > 0` |
| Add first vendor | `vendors.length > 0` |

- Expanded by default; clicking × collapses to a pill button (session-only, resets on refresh)
- Pill shows progress bars + "Getting started · X/5" — always clickable to reopen
- When all 5 done: checklist replaced by a celebration banner ("💍 You're all set up…")

## 9. Budget Tracking

All cost fields start empty. Users enter `estimated_cost` and `actual_cost` per task via the TaskDetailDrawer. The BudgetPanel aggregates these values by category and displays:
- Total estimated vs. total spent
- Per-category breakdown with spend bars
- Remaining budget or over-budget indicator
- Top line items sorted by estimated cost

## 10. Current State (as of 2026-05-09)

**All core features implemented and TypeScript-clean (0 errors):**

| Feature | Status |
|---|---|
| Auth (sign up / sign in) | ✅ |
| Onboarding (create / join wedding) | ✅ |
| Task Board with 13 seeded categories + ~72 subtasks | ✅ |
| Task Detail Drawer (status, priority, due date, assignee, budget, comments) | ✅ |
| Dashboard (hero, countdown, stats, getting-started, urgent tasks, team, activity) | ✅ |
| Budget panel with seeded category estimates, Share%, spend bars | ✅ |
| Guest List with RSVP tracking and bulk import | ✅ |
| Vendor Directory | ✅ |
| Task assignment to team members | ✅ |
| @Mention in comments + in-app notifications | ✅ |
| Admin system (roles, approval, permissions) | ✅ |
| Heatmap calendar view | ✅ |
| Print / export to PDF | ✅ |
| Task translation (en/fr/he) for seeded tasks | ✅ |
| Dark mode | ✅ |
| PWA (installable) | ✅ |
| Getting Started checklist | ✅ |
| Realtime multi-user sync | ✅ |
| Mobile responsive | ✅ |

**Pending migrations (run in Supabase SQL Editor):**
- `007_guests.sql` ⚠️
- `008_vendors.sql` ⚠️
- `009_task_assignment.sql` ⚠️

## 11. Known Issues / Limitations

- **OnboardingTour not translated** — 5 step strings are hardcoded English. Low priority (one-time experience).
- **Budget total editing** — `WeddingSettingsPanel` doesn't have a field to set `wedding.budget_total`. The budget panel's "remaining" tile relies on this field; without it, remaining = $0.
- **Vendor step in Getting Started** — always shows "not done" on first load until vendors query resolves (brief flash). Acceptable UX.
- **Guest/Vendor TypeScript cast** — `(supabase as any).from('guests'|'vendors')` used because DB types not regenerated after new tables. Remove casts after running `supabase gen types`.
- **Comments scroll** — on very long comment threads, the compose form can be pushed off-screen.
- **Activity log raw strings** — status values shown as `todo`/`in_progress`/`done` (not translated) since they come from the DB activity log.
- **No error UI** — if Supabase env vars are missing, app silently fails.

**Previously resolved:**
- ~~RLS violation on `weddings`~~ ✅
- ~~Sidebar hidden on desktop (RTL specificity bug)~~ ✅
- ~~Duplicate key TS6.0.2 errors in translations.ts~~ ✅
- ~~Duplicate `wedding_id` spread errors in GuestListScreen/VendorScreen~~ ✅
- ~~Hebrew `ו` not detected as couple connector~~ ✅ (fixed with `\sו[א-ת]` pattern)
- ~~`\b` word boundary broken for Hebrew in COUPLE_PATTERN~~ ✅
- ~~Getting started "×" permanently dismissed card~~ ✅ (collapse only, reopen via pill)
- ~~Vendor step always "not done" even after adding vendor~~ ✅ (useVendors added to DashboardScreen)
- ~~Budget panel showing only one category~~ ✅ (migration 010 + BudgetPanel improvements)
- ~~Cost inputs stale after realtime update~~ ✅
- ~~Month names always English in HeatmapView~~ ✅

## 12. TODO / Next Steps

**CRITICAL — Run in Supabase SQL Editor (in order):**
1. ⚠️ `007_guests.sql`
2. ⚠️ `008_vendors.sql`
3. ⚠️ `009_task_assignment.sql`
4. ⚠️ `011_clear_seeded_budgets.sql`
5. ⚠️ `012_vendor_task_linking.sql`
4. ⚠️ `010_seed_budget_estimates.sql`

**High priority:**
5. **Translate OnboardingTour** — add `en`/`fr`/`he` strings to `translations.ts`
6. **Regenerate Supabase types** — after running 007/008 migrations, run `supabase gen types typescript` to remove `(supabase as any)` casts in useGuests/useVendors
7. **Budget total field** — add input to `WeddingSettingsPanel` to save `wedding.budget_total` (optional; currently "remaining" is calculated as total_estimated - total_actual)

**Medium priority:**
8. **Comments scroll fix** — sticky/fixed bottom compose form on long comment lists
9. **Email invitations** — send invite links to non-users via email (currently just share code copy)
10. **User avatar upload** — profile photos in collaborator list and comment threads
11. **Vendor count in Getting Started** — already works; verify after migration 008 is applied
12. **Error UI** — graceful error page if VITE_SUPABASE_URL/ANON_KEY are missing

**Nice to have:**
13. **Guest table seating plan** — visual drag-and-drop table assignment view
14. **Budget currency** — configurable currency symbol (currently hardcoded USD)
15. **Export guest list** — CSV download of guest list with RSVP status
16. **Vendor contract file upload** — attach PDFs to vendor records

## 13. Implementation Notes

### @Mention Autocomplete (TaskDetailDrawer)
- Detects `@` keypresses with `/@([\w ]*)$/` against text before cursor
- Dropdown lists matching collaborators from `useCollaborators(weddingId)`
- On submit: resolves mentions via `text.includes('@${c.name}')` (direct match, not regex)
- Inserts notification rows for each mentioned user (excluding commenter)

### Notification Bell (App.tsx)
- Shows unread count badge; clicking opens dropdown + marks all read
- Clicking a notification: `openDrawer(n.task_id)` + closes dropdown
- Realtime INSERT subscription pushes new notifications instantly

### Toast Notifications
- Zustand store in `useToast.ts`; auto-dismiss 3s via setTimeout
- Usage: `useToast().success(msg)` / `useToast().error(msg)`

### Bulk Guest Import
- Textarea → split on newlines → per-entry preview with couple toggle
- Auto-detection: `/\band\b|...|&|\sו[א-ת]/` — marks `isCouple: true`
- Each couple imports with `plus_one: true` (counts as 2 in Attending stat)
- Batch insert: single `supabase.insert(array)` call via `useBulkAddGuests`

### Activity Logging
- `logActivity()` in `useTasks.ts` — called in `useUpdateTask.onSuccess`
- Tracked fields: status, priority, title, description, due_date
- `_prevTask` passed to mutation, destructured before DB spread, diffed in `onSuccess`

### RTL/LTR sidebar — critical CSS note
Use `max-md:ltr:` / `max-md:rtl:` prefixes for directional transforms on the sidebar. Plain `ltr:`/`rtl:` adds an attribute selector that beats breakpoint-only classes (specificity `[0,1,1]` vs `[0,0,1]`), causing the sidebar to stay hidden on desktop.

## 14. Configuration & Deployment

- **Env vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (not committed)
- **Share code:** 8-char uppercase hex, auto-generated by PostgreSQL `md5(random())`
- **Priority scale:** 1=Very Low, 2=Low, 3=Medium, 4=High, 5=Critical
- **`SECURITY DEFINER`** on seed trigger — intentional and load-bearing, do not remove
- **Build:** `npm run build` → Vite outputs to `dist/`
- **Dev:** `npm run dev` → http://localhost:5173 (or next available port)
- **Mobile testing:** `npm run dev -- --host` → LAN access from phone
- **Deployed to:** Vercel (auto-deploy from GitHub main branch)
