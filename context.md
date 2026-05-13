# Wedding Planner — Project Context

## 0. Recent Session Summary

### Session 5 (2026-05-12)
**Guest list filtering & sorting enhancements:**
1. ✅ **Sort by Group** — Added dropdown selector to sort guests by group name (Friends, Family, etc.) or by name (default). When sorting by group, guests are grouped alphabetically by group name, then by name within each group. Guests without a group appear first.
2. ✅ **Group Filter Dropdown** — Added new dropdown that dynamically lists all unique groups from the guest list. Users can select a specific group to view only guests in that group, or "All Groups" to see everyone.
3. ✅ **Search within Group** — The existing search box now works in conjunction with the group filter. Users can filter by group first, then search by name/email/group within that filtered set.
4. ✅ **i18n Support** — Added all translation strings for sort and group filter options in English, French, and Hebrew (RTL).

**Architectural/Code changes (Session 5):**
- Added `GuestSort` type: `'name' | 'group'` for sort dropdown
- Added `groupFilter` state (string | null) to track selected group
- Extracted `allGroups` array from guests: `Array.from(new Set(...)).sort()` to dynamically populate group dropdown
- Updated filtering logic: `if (groupFilter && guest.group_name !== groupFilter) return false`
- Updated sort logic: when `sort === 'group'`, primary sort by group name, secondary sort by name; otherwise sort by name only
- Added group dropdown UI between RSVP filter buttons and search input
- All filter/sort/search operations compose seamlessly (can combine RSVP filter + group filter + search + sort)

**UI Layout (Session 5):**
```
[RSVP Filters: All/Confirmed/Declined/Pending] [Group Dropdown] [Search Box] [Sort Dropdown: Name/Group]
```

**Translation keys added (en/fr/he):**
- `filterAllGroups` — "All Groups" / "Tous les groupes" / "כל הקבוצות"
- `sortByName` — "Name" / "Nom" / "שם"
- `sortByGroup` — "Group" / "Groupe" / "קבוצה"

**WhatsApp Integration Planning (Session 5):**
- Discussed WhatsApp invite feature for Israel-based users
- Recommended MessageBird as provider (simpler than Vonage, free trial with $10 credit)
- Identified required steps: phone field migration, Edge Function for sending WhatsApp, public RSVP endpoint, UI button, bulk send capability
- Feature not yet implemented; awaiting user MessageBird account setup

### Session 4 (2026-05-11)
**Mobile UX & guest management improvements:**
1. ✅ **Fixed mobile header buttons** — language picker + sign out now always visible on mobile (removed `hidden sm:contents` wrapper). Previously disappeared below 640px breakpoint.
2. ✅ **Fixed attending count logic** — `attending` stat now only counts confirmed guests + their confirmed plus-ones (was incorrectly counting all guests with `plus_one: true` regardless of RSVP status). With 3 confirmed and 0 confirmed plus-ones, attending now correctly shows 3 (not 51).
3. ✅ **Bulk import group field** — added optional "Group" input at top of bulk import modal. All guests imported in a batch automatically get the same group name (e.g., "Groom's Friends"). Resets after each import.

**Architectural/DB notes (Session 4):**
- Mobile nav icons: removed conditional `<span className="hidden sm:contents">` wrapper so buttons always render
- Guest stats: changed `const attending = confirmed + plusOnes` → `const confirmedPlusOnes = guests.filter(g => g.rsvp_status === 'confirmed' && g.plus_one).length; const attending = confirmed + confirmedPlusOnes`
- Bulk import state: added `bulkGroup` state, passed to all imported guests via `group_name: bulkGroup.trim() || null`
- SMTP configuration: documented Resend as the recommended SMTP provider for unlimited email confirmations (free tier: 3,000/month)

**Known issues identified (Session 4):**
- Old seed function in live Supabase DB still has hardcoded budget costs — file on disk is clean but migration `002_seed_default_tasks.sql` must be re-run in Supabase SQL Editor to replace the old function. Run `DROP TRIGGER trg_seed_default_tasks ON weddings; CREATE OR REPLACE FUNCTION...` sequence to fix.
- Supabase auth email confirmation has built-in rate limit on free tier; use custom SMTP (Resend recommended) to remove limits.

### Session 3 (2026-05-10)
**Major UI/UX features & analytics:**
1. ✅ **Task assignment notifications** — when a task is assigned to a collaborator, they receive an instant in-app notification via Supabase Realtime
2. ✅ **Assignee avatar on task rows** — SortableSubtaskRow displays a 24px initials circle badge showing who the task is assigned to; always visible (not hover-only on mobile)
3. ✅ **"My task" highlight** — tasks assigned to the current user get a subtle accent-tinted background (6% opacity) for visual emphasis
4. ✅ **Guest list PDF export** — "PDF" button in GuestListScreen header opens a print-ready HTML page with:
   - Summary stats (Total / Confirmed / Declined / Pending / Attending incl. +1s)
   - Full guest table (A-Z sorted): Name, +1, RSVP status (color-coded), Group, Table, Dietary, Email
   - Color-coded RSVP column (green/red/amber)
   - Alternating row shading for readability
   - Uses browser's "Save as PDF" feature
5. ✅ **Vercel Analytics** — `@vercel/analytics` installed and wired up in `main.tsx` for page view tracking

**Key architectural additions (Session 3):**
- Task assignment notification flow: `TaskDetailDrawer` → `useInsertNotifications()` → Supabase notifications table → realtime subscription on mobile
- `SortableSubtaskRow` now accepts `collaborators` and `currentUserId` props for visual assignment feedback
- `TaskBoardScreen` fetches collaborators + current user ID once at top level, passes down to all TaskCards and subtask rows
- `printGuestList()` function generates clean HTML table with inline styling for PDF print-to-file

**Design notes:**
- Avatar shows initials in colored circle (accent blue when it's your task, soft grey otherwise)
- Hover highlight only removes on mouseleave if task is NOT assigned to you (preserves tint for "my tasks")
- Due date/priority badges still fade in on hover for desktop, always hidden on mobile to reduce clutter

## 0A. Recent Session Summary (2026-05-10)

### Session 1 (2026-05-09)
**What was completed:**
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

### Session 2 (2026-05-10)
**Major fixes & UX improvements:**
1. ✅ **Removed seeded budget mock data** — no more predefined cost estimates; users control budget allocation entirely
2. ✅ **Vendor-to-budget linking** — vendors now link to tasks via `task_id` FK; vendor costs included in BudgetPanel calculations; added "Link to Task" dropdown in vendor edit form
3. ✅ **Realtime vendor subscription** — added `postgres_changes` subscription to `useVendors` hook for instant budget updates when vendors are added/edited on mobile
4. ✅ **Typography hierarchy fixes** — standardized stat numbers to `32px font-display 400` across all screens; section headers to `20px`; row text to `14px 600`; form labels to `.font-mono-ui` class
5. ✅ **Mobile UX polish (Quick Wins 1-6):**
   - Mobile modal sizing: vendor/guest forms responsive (`maxHeight: 90vh`, full width on mobile `<480px`)
   - Loading states: "…" indicators on empty screens during data fetch
   - Required field markers: red `*` asterisks on Name fields in vendor/guest forms
   - Touch target sizes: all buttons ≥44px minimum height/width (buttons were 6-8px, now 10-12px + minHeight 40-44px)
   - Bulk import toast: confirmation message shows person count after import
   - Tablet breakpoint: dashboard two-col layout stays two-column up to 900px (was 768px)
   - Font standardization: all form field labels now use `.font-mono-ui` class instead of inline `fontFamily`
6. ✅ **Auth/realtime error guards** — wrapped all Supabase realtime subscriptions in try-catch to prevent blank-page crashes when auth token is refreshing or client not fully initialized

**Key architectural decisions (Session 2):**
- Vendor costs now flow through BudgetPanel via: `vendors.filter(v => v.task_id === cat.id)` → sum `v.total_cost` → add to category estimated
- No mock/seeded budget data — user starts with zero costs; app is "bring your own numbers"
- Realtime subscriptions now defensive: check for `.on()` method existence, wrapped in try-catch, safe unsubscribe

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
│   ├── useTasks.ts              useTaskTree, useUpdateTask (optimistic), useAddTask, useDeleteTask, activity logging
│   ├── useComments.ts           useComments, useAddComment (@mention notifications + parsing), useActivity
│   ├── useCollaborators.ts      All profiles for a wedding (used for @mention autocomplete + assignee picker)
│   ├── useNotifications.ts      useNotifications (realtime with error guards), useMarkNotificationsRead, useInsertNotifications
│   ├── useGuests.ts             useGuests, useAddGuest, useUpdateGuest, useDeleteGuest, useDeleteAllGuests, useBulkAddGuests
│   ├── useVendors.ts            useVendors (with realtime subscription), useAddVendor, useUpdateVendor, useDeleteVendor
│   ├── useAdminActions.ts       useApproveMember, useRejectMember, useRemoveMember, useSetMemberRole
│   ├── useToast.ts              Toast store (success/error, auto-dismiss 3s)
│   └── usePresence.ts           Real-time user presence tracking (with error guards)
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
├── 001_initial_schema.sql          Tables, RLS, triggers ✅ APPLIED
├── 002_seed_default_tasks.sql      seed_default_tasks() + trigger (no budget estimates) ✅ APPLIED
├── 003_rpc_find_wedding.sql        find_wedding_by_code() RPC ✅ APPLIED
├── 004_add_cost_columns.sql        estimated_cost / actual_cost on tasks ✅ APPLIED
├── 005_notifications.sql           notifications table + RLS + realtime ✅ APPLIED
├── 006_admin_system.sql            role + member_status on profiles ✅ APPLIED
├── 007_guests.sql                  guests table + RLS ⚠️ PENDING (needed for guest feature)
├── 008_vendors.sql                 vendors table + RLS ⚠️ PENDING (needed for vendor feature)
├── 009_task_assignment.sql         assigned_to column on tasks ⚠️ PENDING (needed for task assignment)
├── 010_seed_budget_estimates.sql   [DEPRECATED] Seeded budget data — do not run (user-entered only as of Session 2)
├── 011_clear_seeded_budgets.sql    [DEPRECATED] Clears seeded data — do not run
└── 012_vendor_task_linking.sql     task_id FK on vendors table ⚠️ PENDING (needed for vendor-budget integration)

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
- **Auto-seed trigger**: `trg_seed_default_tasks` fires AFTER INSERT on `weddings` and inserts 13 categories + ~72 subtasks with realistic due dates and NO budget estimates (user-entered only as of Session 2).
- **`_prevTask` pattern**: `useUpdateTask` accepts optional `_prevTask?: Task` (destructured before spread so it never reaches the DB) for activity log diffing in `onSuccess`.
- **Controlled cost inputs**: Cost fields in TaskDetailDrawer use `localEstimated`/`localActual` state synced via `useEffect` on `task?.id` — prevents stale values after realtime updates.
- **Getting started collapse**: Stored in Zustand session state only (not localStorage). Resets on page refresh. Auto-disappears when all 5 steps genuinely complete from live data.
- **Vendor-budget integration**: Vendors link to tasks via `task_id` FK. `BudgetPanel` filters vendors by `v.task_id === cat.id` and sums their `total_cost` into category estimated costs. Deposit tracking: if `v.deposit_paid`, includes `v.deposit_amount` in actual spend.
- **Realtime subscription guards**: All `postgres_changes` subscriptions in `useVendors`, `useNotifications`, `usePresence` wrapped in try-catch. Defensive check: `if (!vendorTable?.on)` before calling `.on()`. Prevents blank-page crashes during auth token refresh.
- **Budget cost strategy (user-controlled)**: Vendors entering `total_cost` in edit form; cost flows through BudgetPanel via task linking. No seeded estimates. Remaining budget = total_estimated - total_actual. If `wedding.budget_total` not set, remaining shows as $0 (acceptable for user-driven budgeting).
- **Duplicate key TS6.0.2 protection**: TypeScript 6.0.2 throws `TS1117` on duplicate literal keys in object literals. The `vendors` translation section uses `contractsSigned` (not `signed`) for the stat tile to avoid collision with the `signed` contract status option key.
- **Duplicate `wedding_id` spread fix**: When building insert/update payloads from a draft object that already contains `wedding_id`, destructure it out first: `const { wedding_id: _w, ...data } = draft`.
- **Typography hierarchy (8-level scale)**: Stat numbers: `32px font-display 400`; section headers: `20px font-display 400`; card primary: `14px 600`; labels: `10px 600 font-mono-ui`. Applied across Dashboard, GuestList, Vendor, Budget screens for visual consistency.
- **Mobile-first responsive design**: Modals use `90vh` max-height with full-width on mobile (`<480px`). Tablet breakpoint for two-column layouts: `900px` (increased from `768px`). Touch targets: all interactive elements minimum `40-44px` height/width.

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

## 8. Mobile UX Improvements (Session 2 Quick Wins 1-6)

**1. Modal Responsive Sizing:**
- Desktop: `maxWidth: 600px` (vendor) / `560px` (guest)
- Mobile (`<480px`): `maxWidth: 100%` (full screen width)
- All modals: `maxHeight: 90vh` (leaves room for keyboard)
- Affected: `VendorScreen`, `GuestListScreen` (both add/edit + bulk import)

**2. Touch Target Compliance:**
- Goal: minimum `44-48px` for touch targets (WCAG standard)
- Changes:
  - Vendor/guest card action buttons: `minHeight: 44px`
  - Table row edit/delete buttons: `minHeight: 40px, minWidth: 40px`
  - Bulk import couple toggle: increased from `32×28px` → `44×44px`
- All buttons maintain visual consistency while meeting accessibility standards

**3. Required Field Markers:**
- Name fields in vendor/guest forms: red `*` asterisk
- HTML `required` attribute added to inputs (browser validation)
- Style: `<span style={{ color: 'var(--bad)' }}>*</span>`

**4. Form Field Label Consistency:**
- Removed inline `fontFamily: 'var(--font-mono, monospace)'`
- All form labels now use `.font-mono-ui` class
- Ensures Geist Mono branding across all screens
- Applied in: VendorScreen, GuestListScreen (all form sections)

**5. Tablet Breakpoint Adjustment:**
- Changed `.dashboard-two-col` breakpoint from `768px` → `900px`
- Impact: two-column layout stays together on larger tablets (iPad, 10" devices)
- Only collapses to single column on phones (`<900px`)

**6. Loading States:**
- Empty screens show "…" centered text while data loads
- Applied to: VendorScreen, GuestListScreen (both list views)
- Prevents visual jarring during React Query hydration

---

## 8A. Getting Started Checklist (DashboardScreen)

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

## 8A. Typography Hierarchy (Session 2 Implementation)

Standardized 8-level visual hierarchy across all screens for consistent emphasis:

| Level | Role | Size | Weight | Font | Color | Example |
|---|---|---|---|---|---|---|
| L1 | Hero number | clamp(52–88px) | 400 | `font-display` | `--accent` | Countdown days |
| L2 | Page title | clamp(28–44px) | 400 | `font-display` | `--ink` | "Guests" / "Vendors" |
| L3 | Stat number | `32px` | 400 | `font-display` | `--ink` | "247" guests, "$80k" budget |
| L4 | Section header | `20px` | 400 | `font-display` | `--ink` | "By Category" / "Urgent Tasks" |
| L5 | Card/row primary | `14px` | 600 | sans | `--ink` | Guest name, task title |
| L6 | Body / subtitle | `13px` | 400 | sans | `--ink-3` | Guest email, task description |
| L7 | Stat label / table header | `10px` | 600 | `font-mono-ui` | `--ink-4` | "TOTAL GUESTS", "RSVP", "CATEGORY" |
| L8 | Timestamp / meta | `11px` | 400 | `font-mono-ui` | `--ink-4` | Activity timestamps, relative time |

**Applied to screens:**
- `DashboardScreen` — stat tiles, section headers, task rows
- `GuestListScreen` — guest stat tiles, table headers, guest names
- `VendorScreen` — vendor stat tiles, form labels
- `BudgetPanel` — budget tiles, category headers, line items

**Implementation notes:**
- All `.font-mono-ui` labels use the CSS class (not inline `fontFamily`)
- Form field labels: `<label className="font-mono-ui" style={fieldLabel}>Label *</label>`
- Stat numbers: `<p className="font-display" style={{ fontSize: 32, ... }}>99</p>`

---

## 9. Budget Tracking System

**Cost entry points:**
1. **Per-task costs** — TaskDetailDrawer: users enter `estimated_cost` and `actual_cost` per subtask
2. **Vendor costs** — VendorScreen: vendors have `total_cost` and optional `deposit_amount`

**Cost aggregation (BudgetPanel):**
```
per_category_estimated = SUM(category_tasks[*].estimated_cost) 
                       + SUM(vendors WHERE vendor.task_id IN category_task_ids).total_cost
per_category_actual    = SUM(category_tasks[*].actual_cost) 
                       + SUM(vendors WHERE vendor.deposit_paid).deposit_amount
```

**Display:**
- Total estimated vs. total spent (summary tiles with progress bar)
- Per-category breakdown with spend bars (side-by-side estimated/actual)
- Remaining budget = total_estimated - total_actual (green if positive, red if over-budget)
- Top 8 line items (subtasks with `estimated_cost > 0`) sorted by cost descending

**Design decision (Session 2):**
- No seeded/default costs — users start with `$0` and control all spending
- Vendor `total_cost` flows into the budget only if `vendor.task_id` is set (category or subtask)
- Deposit tracking: only counts `deposit_amount` if `deposit_paid = true`
- Optional: `wedding.budget_total` can be set to track against a grand total (currently unused, acceptable for user-driven budgeting)

## 10. Current State (as of 2026-05-12, end of Session 5)

**All core features implemented and TypeScript-clean (0 errors):**

| Feature | Status |
|---|---|
| Auth (sign up / sign in) | ✅ |
| Onboarding (create / join wedding) | ✅ |
| Task Board with 13 seeded categories + ~72 subtasks | ✅ |
| Task Detail Drawer (status, priority, due date, assignee, budget, comments) | ✅ |
| Dashboard (hero, countdown, stats, getting-started, urgent tasks, team, activity) | ✅ |
| Budget panel (user-entered estimates, vendor costs linked to tasks, per-category breakdown) | ✅ |
| Guest List with RSVP tracking and bulk import (+ group field) | ✅ |
| **Guest list sort by name/group** | ✅ |
| **Guest list filter by group dropdown** | ✅ |
| **Guest list search within filtered group** | ✅ |
| Vendor Directory with contract/deposit tracking | ✅ |
| Vendor-to-task linking (vendors linked to category/subtasks for budget integration) | ✅ |
| Task assignment to team members | ✅ |
| Task assignment notifications + visual feedback | ✅ |
| Assignee avatar badge on task rows (mobile-visible) | ✅ |
| "My task" highlight (subtle accent tint) | ✅ |
| @Mention in comments + in-app notifications | ✅ |
| Guest list PDF export (summary + sorted table) | ✅ |
| Admin system (roles, approval, permissions) | ✅ |
| Heatmap calendar view | ✅ |
| Print / export to PDF | ✅ |
| Task translation (en/fr/he) for seeded tasks | ✅ |
| Dark mode | ✅ |
| PWA (installable) | ✅ |
| Vercel Analytics (page views) | ✅ |
| Getting Started checklist | ✅ |
| Realtime multi-user sync with error guards | ✅ |
| Mobile responsive (modal sizing, 48px+ touch targets, tablet breakpoint 900px) | ✅ |
| Mobile header buttons always visible (language + sign out) | ✅ |
| Attending count (correctly excludes unconfirmed plus-ones) | ✅ |
| Typography hierarchy (serif numbers, monospace labels, clear visual hierarchy) | ✅ |
| Form required field markers | ✅ |

**Pending migrations (run in Supabase SQL Editor):**
- `007_guests.sql` ⚠️ (needed for guest persistence)
- `008_vendors.sql` ⚠️ (needed for vendor persistence)
- `009_task_assignment.sql` ⚠️ (needed for task assignment)
- `012_vendor_task_linking.sql` ⚠️ (needed for vendor-budget integration)

## 11. Known Issues / Limitations

**Current (unfixed):**
- **Old seed function in Supabase DB** — The live `seed_default_tasks()` function in your Supabase project still contains hardcoded budget costs (from before Session 2). The migration file on disk is clean, but must be re-run in the Supabase SQL Editor:
  ```sql
  DROP TRIGGER IF EXISTS trg_seed_default_tasks ON public.weddings;
  -- then paste entire contents of 002_seed_default_tasks.sql
  ```
  After this, all new weddings will seed with $0 budget. Existing weddings with mock data must be cleaned manually.
- **Supabase auth email rate limit** — Built-in email has strict rate limits on free tier. Recommended fix: set up custom SMTP with Resend (free tier: 3,000 emails/month). Configure in Supabase → Auth → Settings → SMTP Settings.
- **OnboardingTour not translated** — 5 step strings are hardcoded English. Low priority (one-time experience).
- **Budget total editing** — `WeddingSettingsPanel` doesn't have a field to set `wedding.budget_total`. The budget panel's "remaining" tile relies on this field; without it, remaining = $0.
- **Guest/Vendor TypeScript cast** — `(supabase as any).from('guests'|'vendors')` used because DB types not regenerated after new tables. Remove casts after running `supabase gen types`.
- **Comments scroll** — on very long comment threads, the compose form can be pushed off-screen.
- **Activity log raw strings** — status values shown as `todo`/`in_progress`/`done` (not translated) since they come from the DB activity log.
- **No error UI** — if Supabase env vars are missing, app silently fails.
- **Modal inline media queries** — mobile modal resize uses inline `@media` in style prop (CSS-in-JS workaround). Not ideal; consider moving to CSS class if adding more media queries.

**Previously resolved (Session 1):**
- ~~RLS violation on `weddings`~~ ✅
- ~~Sidebar hidden on desktop (RTL specificity bug)~~ ✅
- ~~Duplicate key TS6.0.2 errors in translations.ts~~ ✅
- ~~Duplicate `wedding_id` spread errors in GuestListScreen/VendorScreen~~ ✅
- ~~Hebrew `ו` not detected as couple connector~~ ✅ (fixed with `\sו[א-ת]` pattern)
- ~~`\b` word boundary broken for Hebrew in COUPLE_PATTERN~~ ✅
- ~~Getting started "×" permanently dismissed card~~ ✅ (collapse only, reopen via pill)
- ~~Vendor step always "not done" even after adding vendor~~ ✅ (useVendors added to DashboardScreen)
- ~~Budget panel showing only one category~~ ✅ (BudgetPanel improvements)
- ~~Cost inputs stale after realtime update~~ ✅
- ~~Month names always English in HeatmapView~~ ✅

**Previously resolved (Session 2):**
- ~~Seeded budget mock data conflicting with user intent~~ ✅ (removed all seeded cost estimates)
- ~~Vendor costs not appearing in budget panel~~ ✅ (vendor-to-task linking + cost aggregation)
- ~~Vendor added on mobile doesn't show in budget until refresh~~ ✅ (realtime subscription + React Query invalidation)
- ~~Typography hierarchy flat on all screens~~ ✅ (8-level scale implemented, stat numbers to 32px serif)
- ~~Form field label fonts inconsistent~~ ✅ (all standardized to `.font-mono-ui` class)
- ~~Touch targets too small for mobile~~ ✅ (all interactive elements ≥40px)
- ~~Blank page after login on mobile~~ ✅ (realtime subscription error guards added to all hooks)

## 12. TODO / Next Steps

**CRITICAL — Fix before new users see mock budget data:**
1. ⚠️ **Re-run seed migration in Supabase SQL Editor:**
   - Run: `DROP TRIGGER IF EXISTS trg_seed_default_tasks ON public.weddings;`
   - Then paste entire contents of `supabase/migrations/002_seed_default_tasks.sql`
   - This replaces the old function with the clean version (no hardcoded costs)
2. ⚠️ **Set up SMTP for auth emails** — configure Resend in Supabase → Auth → Settings → SMTP Settings to remove rate limits

**CRITICAL — Outstanding migrations (if not yet run):**
1. ⚠️ `007_guests.sql` — guests table + RLS
2. ⚠️ `008_vendors.sql` — vendors table + RLS
3. ⚠️ `009_task_assignment.sql` — assigned_to column
4. ⚠️ `012_vendor_task_linking.sql` — task_id FK for budget linking

**High priority (UX gaps identified in audit):**
1. **Multi-wedding support** — enable users to be collaborators on 2+ weddings; show wedding picker after login if user belongs to multiple weddings (currently: single `wedding_id` on profiles, joining new wedding overwrites old)
2. **WhatsApp guest invitations** — add phone field to guests table + MessageBird WhatsApp API + public RSVP link endpoint (user can send WhatsApp guests a link to confirm attendance without app login). Setup guide: MessageBird account → WhatsApp channel verification → Supabase Edge Function to send messages → public RSVP confirmation endpoint. Feature planned, awaiting user MessageBird account setup.
3. **Vendor linking visual indicator** — show small badge/icon on vendor cards when linked to a task
4. **Plus-one relationship clarity** — improve visual distinction between main guest and plus-one (currently just small text)
5. **Translate OnboardingTour** — add `en`/`fr`/`he` strings to `translations.ts`
6. **Regenerate Supabase types** — after running 007/008/009 migrations, run `supabase gen types typescript` to remove `(supabase as any)` casts in useGuests/useVendors
7. **Budget total field** — add input to `WeddingSettingsPanel` to save `wedding.budget_total` (optional; currently "remaining" is calculated as total_estimated - total_actual)

**Medium priority:**
8. **Comments scroll fix** — sticky/fixed bottom compose form on long comment lists
9. **Email invitations** — send invite links to non-users via email (currently just share code copy)
10. **User avatar upload** — profile photos in collaborator list and comment threads
11. **Modal media queries to CSS** — move inline `@media` from vendor/guest modal styles to proper CSS class
12. **Error UI** — graceful error page if VITE_SUPABASE_URL/ANON_KEY are missing

**Nice to have:**
13. **Guest table seating plan** — visual drag-and-drop table assignment view
14. **Budget currency** — configurable currency symbol (currently hardcoded USD)
15. **Export guest list** — CSV download of guest list with RSVP status (note: PDF export ✅ already done)
16. **Vendor contract file upload** — attach PDFs to vendor records
17. **Form data loss warning** — alert when closing a modal with unsaved form changes

**Completed this session (Session 5):**
- ✅ Added sort by name/group dropdown to guest list (dynamically sorts by group name or name)
- ✅ Added group filter dropdown to guest list (dynamically populated with all unique groups from guests)
- ✅ Implemented search within filtered group (all filter/sort/search operations compose seamlessly)
- ✅ Added i18n support for all new guest list features (en/fr/he)
- ✅ Analyzed WhatsApp integration options for Israel; recommended MessageBird provider

**Completed in previous session (Session 4):**
- ✅ Fixed mobile header buttons visibility (language picker + sign out always show)
- ✅ Fixed attending count calculation (only includes confirmed guests + confirmed plus-ones)
- ✅ Added bulk import group field (optional group name applied to all imported guests at once)
- ✅ Documented SMTP setup (Resend recommended for unlimited email confirmations)
- ✅ Identified old seed function issue in live Supabase (migration needs re-run)

**Completed in Session 3:**
- ✅ Task assignment notifications (realtime, Supabase insert)
- ✅ Assignee avatar badge on task rows (24px initials circle, accent-tinted when assigned to you)
- ✅ "My task" highlight (6% accent background tint)
- ✅ Guest list PDF export (summary stats + A-Z sorted table with color-coded RSVP)
- ✅ Vercel Analytics integration

**Completed in Session 2:**
- ✅ Removed seeded budget mock data
- ✅ Implemented vendor-to-task linking for budget integration
- ✅ Added realtime vendor subscription to sync budget updates instantly
- ✅ Fixed typography hierarchy across all screens
- ✅ Improved mobile UX (modals, touch targets, form labels, breakpoints)
- ✅ Added error guards to all realtime subscriptions to prevent auth-related crashes

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

### Task Assignment & Notifications (Session 3)
- **Assigning a task:** TaskDetailDrawer's "Assigned to" dropdown triggers `useInsertNotifications.mutate()` to insert a notification row in the DB
- **Visual feedback:** `SortableSubtaskRow` displays a 24px avatar with assignee initials; accent-colored when assigned to current user
- **Row highlight:** Tasks assigned to current user get a 6% accent-tinted background; tint persists on hover (not removed until mouseleave)
- **Realtime delivery:** Notification subscription in `useNotifications` hook listens for INSERTs; notification bell updates in real-time

### Toast Notifications
- Zustand store in `useToast.ts`; auto-dismiss 3s via setTimeout
- Usage: `useToast().success(msg)` / `useToast().error(msg)`

### Guest List PDF Export (Session 3)
- Button appears in GuestListScreen header when `guests.length > 0`
- `printGuestList()` function generates clean HTML with:
  - Summary stats row (5 tiles: Total, Confirmed, Declined, Pending, Attending incl. +1s)
  - Full table: Name | +1 | RSVP (color-coded green/red/amber) | Group | Table | Dietary | Email
  - Guests sorted A-Z
  - Alternating row shading for readability
- Uses `window.open()` to create a new tab with the HTML; `window.print()` after 300ms delay for browser PDF save dialog
- Supports browser's "Save as PDF" feature

### Bulk Guest Import
- Textarea → split on newlines → per-entry preview with couple toggle
- Auto-detection: `/\band\b|...|&|\sו[א-ת]/` — marks `isCouple: true`
- Each couple imports with `plus_one: true` (counts as 2 in Attending stat)
- Batch insert: single `supabase.insert(array)` call via `useBulkAddGuests`

### Activity Logging
- `logActivity()` in `useTasks.ts` — called in `useUpdateTask.onSuccess`
- Tracked fields: status, priority, title, description, due_date
- `_prevTask` passed to mutation, destructured before DB spread, diffed in `onSuccess`

### Guest List Filtering & Sorting (Session 5 Implementation)

**State management (GuestListScreen):**
```typescript
const [filter, setFilter] = useState<RsvpFilter>('all')       // RSVP status filter
const [groupFilter, setGroupFilter] = useState<string | null>(null)  // Group filter
const [sort, setSort] = useState<GuestSort>('name')          // Sort order
const [search, setSearch] = useState('')                      // Text search
```

**Dynamic group list:**
```typescript
const allGroups = Array.from(new Set(
  guests.map(g => g.group_name).filter((g): g is string => g !== null && g !== '')
)).sort()
```

**Composable filtering pipeline:**
1. RSVP filter: `if (filter !== 'all' && guest.rsvp_status !== filter) return false`
2. Group filter: `if (groupFilter && guest.group_name !== groupFilter) return false`
3. Text search: matches name, email, or group_name (case-insensitive substring match)
4. Sorting: primary by group name (if `sort === 'group'`), secondary by name in all cases

**UI Layout (GuestListScreen):**
```
[RSVP Filter Buttons: All/Confirmed/Declined/Pending] [Group Dropdown] [Search Input] [Sort Dropdown: Name/Group]
```

**Key design decisions:**
- Group dropdown only shows groups that exist in the guest list (no hardcoded groups)
- Selecting a group filters to that group only; selecting "All Groups" clears the filter
- Search works across all fields (name, email, group), not just the filtered group
- Sort applies after filter, so users can group by category then sort alphabetically within
- No default group selected; "All Groups" is the starting state

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
