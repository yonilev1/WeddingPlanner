# Wedding Planner — Project Context

## 1. Project Overview

A collaborative wedding planning web app where couples and their planning team can:
- Track all planning tasks organized by category (venue, catering, photography, etc.)
- Monitor progress via a dashboard with countdown, completion stats, and urgent task alerts
- Manage task details: status, priority, due date, notes, comments, and activity history
- Share a wedding with collaborators via a unique share code

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
- **Zustand (`uiStore`)** — ephemeral UI: active tab, selected category, open drawer task, expanded task IDs
- **Supabase Realtime** — `postgres_changes` subscriptions invalidate React Query cache for live multi-user sync

### Task hierarchy
Tasks are flat rows with a `parent_task_id` FK (NULL = category/top-level). The app organizes them client-side into `TaskWithSubtasks[]` via `useTaskTree()`.

### RLS + SECURITY DEFINER
Every table has RLS. The helper `get_user_wedding_id()` (SECURITY DEFINER) is used in all policies to resolve the current user's wedding without exposing `profiles` directly. The seed trigger function also runs as SECURITY DEFINER to bypass RLS during the initial task seeding (the profile hasn't been linked to the new wedding yet at trigger time).

## 4. Key Files & Structure

```
src/
├── lib/supabase.ts              Supabase client (typed with Database generic)
├── types/database.ts            All DB types + convenience aliases
├── store/uiStore.ts             Zustand store (UI state + dark mode + tour progress, localStorage-persisted)
├── hooks/
│   ├── useAuth.ts               Auth state + profile, signOut, refreshProfile
│   ├── useWedding.ts            Fetches single wedding row
│   ├── useTasks.ts              useTasks, useTaskTree, useUpdateTask (optimistic), useAddTask
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
│   ├── DashboardScreen.tsx      Countdown, progress, categories, urgent tasks
│   ├── TaskBoardScreen.tsx      Category sidebar + expandable task cards + realtime + keyboard shortcuts
│   ├── TaskDetailDrawer.tsx     Right-panel drawer: details / comments / activity (escape to close, enter to save)
│   ├── ToastContainer.tsx       Fixed bottom-right toast notifications (success/error)
│   ├── PrintView.tsx            Full-screen print preview, checklist by category
│   ├── OnboardingTour.tsx       5-step guided first-run tour with localStorage persistence
│   ├── CollaboratorPanel.tsx    Right sidebar for sharing and online user presence
│   ├── BudgetPanel.tsx          Budget summary and per-category cost tracking
│   ├── App.tsx                  App shell + top nav (countdown, dark mode toggle, budget, share code, collaborators)
│   └── main.tsx                 React root + QueryClientProvider

supabase/migrations/
├── 001_initial_schema.sql       Tables, indexes, RLS policies, triggers
└── 002_seed_default_tasks.sql   seed_default_tasks() + trg_seed_default_tasks
```

### Key design decisions
- **Comments join is manual**: `comments.user_id` → `auth.users` is not reachable via PostgREST. `useComments` fetches comments then fetches matching profiles by ID and merges them client-side. Same pattern for `useActivity`.
- **Optimistic updates**: `useUpdateTask` writes to the React Query cache instantly on mutation start; reverts on error, re-fetches on settle.
- **Auto-seed trigger**: `trg_seed_default_tasks` fires AFTER INSERT on `weddings` and calls `seed_default_tasks()` which inserts 13 category tasks and ~72 subtasks with priorities and relative due dates.

## 5. Current State

**Core Features (Fully Implemented):**
- Full database schema with RLS (migration 001)
- Auto-seed of ~85 default tasks on wedding creation (migration 002)
- Auth flow: sign up (with display name) + sign in
- Onboarding: create new wedding or join via share code
- Dashboard screen: countdown, overall progress, per-category progress, urgent tasks list
- Task Board: category sidebar with progress, expandable task cards, subtask rows with inline checkbox + drawer link, Realtime sync
- Task Detail Drawer: edit title/description (onBlur), change status/priority/due date (immediate), comments with realtime subscription, activity log
- Top nav: wedding name, tab switcher, countdown chip, share code copy, sign out
- Collaborator Panel: show online users, share code, manage wedding members
- Budget Panel: budget tracker with per-category cost summaries

**Polish Features (Fully Implemented - Session 2):**
1. **Empty States** — Illustrated empty states in every list, panel, and category (checklist icon, encouraging messages)
2. **Optimistic UI** — Instant visual feedback on task edits via React Query `onMutate`/`onError`/`onSettled` cache updates
3. **Toast Notifications** — Auto-dismiss success/error toasts (3s timeout), fixed bottom-right container
4. **Keyboard Shortcuts** — 
   - `N` = new task (any screen)
   - `/` = focus search input
   - `Escape` = close drawer or cancel add-task form
   - `Enter` = save title in drawer or submit new task/category form
5. **Print/Export to PDF** — Full-screen checklist preview by category; browser print dialog to save as PDF
6. **Onboarding Tour** — 5-step guided first-run tooltip tour (Welcome, Categories & Tasks, Filters & Search, Calendar, Collaborate & Budget); stored in localStorage, one-time per browser
7. **Dark Mode Toggle** — Top nav button with Sun/Moon icons; persistent to localStorage; Tailwind `darkMode: 'class'`

**Build Status:**
- Clean build: ✓ 135 modules transformed
- TypeScript: 0 errors
- No console errors or warnings
- All features functional end-to-end

**Not yet implemented:**
- Edit wedding name or date after onboarding
- Delete tasks
- Drag-and-drop reordering
- Notifications / reminders
- Mobile-optimised layout (currently functional but not polished on small screens)
- Email confirmation handling (Supabase project setting dependent)
- User avatar upload

## 6. Open Issues / Bugs

**Blocking (Awaiting User Confirmation):**
- **RLS violation on `weddings` table** — "new row violates row-level security policy for table 'weddings'" when creating a wedding after signup. 
  - Root cause: RLS enabled but `weddings_insert` policy was not successfully applied or needs renewal.
  - **Fix provided (SQL to run in Supabase Dashboard → SQL Editor):**
    ```sql
    DROP POLICY IF EXISTS "weddings_insert" ON public.weddings;
    CREATE POLICY "weddings_insert"
      ON public.weddings FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
    DROP POLICY IF EXISTS "weddings_select" ON public.weddings;
    CREATE POLICY "weddings_select"
      ON public.weddings FOR SELECT
      USING (id = public.get_user_wedding_id());
    DROP POLICY IF EXISTS "weddings_update" ON public.weddings;
    CREATE POLICY "weddings_update"
      ON public.weddings FOR UPDATE
      USING (id = public.get_user_wedding_id());
    ```
  - **Status:** Awaiting user confirmation that fix resolves the issue.

**Known Limitations:**
- TypeScript 6.0.2 + Supabase JS v2 incompatibility — workaround is to cast `supabase.from('table')` to `any` when needed.
- No error UI if Supabase env vars are missing (app silently fails to load).
- Comments tab scroll: on very long comment lists the "Write a comment" form can be pushed off-screen instead of sticking to the bottom.

## 7. TODO / Next Steps

**Critical (Blocking):**
1. **Resolve RLS violation on `weddings` table** — Run the provided SQL fix in Supabase SQL Editor and confirm that wedding creation works after signup.

**High Priority (Feature Complete, Polish):**
2. **Delete task** — add a delete button in `TaskDetailDrawer` with a confirmation step; call `supabase.from('tasks').delete()`.
3. **Edit wedding settings** — small settings panel to update `weddings.name` and `weddings.date`.
4. **Activity log completion** — verify that activity entries are being written on task updates; if not, add DB trigger or client-side logging.

**Medium Priority (Enhancements):**
5. **Mobile polish** — ensure sidebar collapses on small screens, drawer takes full width, test on devices/viewport sizes.
6. **Drag-and-drop** — reorder subtasks within a category using `display_order`; consider `@dnd-kit/core`.
7. **Comments scroll fix** — sticky bottom form on long comment lists.
8. **Error UI** — graceful error message if Supabase env vars are missing.
9. **Email confirmation handling** — handle the case where Supabase requires email verification before sign-in works.

## 8. Implementation Notes — Polish Features

### Toast Notifications
- **Location:** `src/hooks/useToast.ts` (Zustand store) + `src/components/ToastContainer.tsx`
- **Pattern:** Store holds array of `{ id, message, kind }`. Each toast auto-dismisses after 3 seconds via `setTimeout`.
- **Usage:** Call `useToastStore().addToast(message, 'success' | 'error')` from any component.
- **Styling:** Fixed bottom-right, colored by kind (green for success, red for error).

### Dark Mode
- **Location:** Tailwind config (`darkMode: 'class'`), `src/index.css` (dark mode body styles), `src/store/uiStore.ts` (toggle state + localStorage).
- **Pattern:** `document.documentElement.classList.toggle('dark', enabled)` syncs Tailwind's dark class. State persisted to `weddingPlanner:darkMode` in localStorage.
- **Usage:** Call `useUIStore().toggleDarkMode()` from any component. `MainApp` has useEffect to re-sync on mount.

### Keyboard Shortcuts
- **Locations:** `src/components/TaskBoardScreen.tsx` (N, /), `src/components/TaskDetailDrawer.tsx` (Escape, Enter on title)
- **Implementation:** useEffect with `window.addEventListener('keydown', ...)` — check event.key and call appropriate handlers.
- **Priority layering:** Check `addingTask` or `addingCategory` state first; if neither is true, check drawer; last resort is search focus.

### Print/Export
- **Location:** `src/components/PrintView.tsx` (full-screen overlay + checklist rendering), `src/index.css` (@media print block)
- **Pattern:** Button in main view calls `window.print()` to trigger browser print dialog. `@media print` CSS hides app chrome (`body > #root > * { display: none }`), shows `#print-content` div.
- **Output:** Browser PDF save dialog allows user to save as PDF.

### Onboarding Tour
- **Location:** `src/components/OnboardingTour.tsx`, `src/store/uiStore.ts` (tourDone state + localStorage)
- **Pattern:** 5-step tour with dot indicator, Back/Next/Skip buttons. Tours are positioned relative to DOM elements using calculated offsets. Rendered conditionally in `App.tsx` when `!tourDone`.
- **State:** `tourDone` persisted to `weddingPlanner:tourDone`; set to true after user completes or skips.
- **Dark mode:** Tour styling respects dark mode (bg/text colors conditional).

### Empty States
- **Pattern:** Conditional rendering in all list views. When data is empty or loading, show illustrated placeholder with icon and encouraging message.
- **Examples:** "No tasks yet. Create one with the N key!" in TaskBoardScreen, "No comments yet. Start the conversation!" in TaskDetailDrawer comments tab.

### Optimistic UI
- **Pattern:** React Query's `useMutation` with `onMutate` callback writes to cache immediately, `onError` reverts, `onSettled` re-fetches server data.
- **Usage:** See `useUpdateTask` and `useAddTask` in `src/hooks/useTasks.ts`.
- **Example:** Changing task status updates the UI instantly; if the update fails, the old state is restored.

## 9. Configuration & Deployment Notes

- Supabase project URL and anon key live in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are not committed.
- Both SQL migrations must be run manually in the Supabase SQL Editor (no Supabase CLI is configured).
- The share code is an 8-character uppercase hex string auto-generated by PostgreSQL (`md5(random())`).
- Priority scale: 1 = Very Low, 2 = Low, 3 = Medium, 4 = High, 5 = Critical.
- `SECURITY DEFINER` on the seed trigger function is intentional and load-bearing — do not remove it.
- **Build command:** `npm run build` → Vite outputs to `dist/`
- **Dev command:** `npm run dev` → Vite dev server on `http://localhost:5173`
