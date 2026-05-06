-- ============================================================
-- Wedding Planner — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ───────────────────────────────────────────────
-- Extensions
-- ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────
-- Tables
-- ───────────────────────────────────────────────

CREATE TABLE public.weddings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  date        DATE,
  share_code  TEXT        UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 8)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  avatar_url  TEXT,
  wedding_id  UUID        REFERENCES public.weddings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT        NOT NULL,
  description    TEXT,
  -- 1 = lowest priority, 5 = highest
  priority       INTEGER     CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
  status         TEXT        NOT NULL DEFAULT 'todo'
                               CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date       DATE,
  wedding_id     UUID        NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  parent_task_id UUID        REFERENCES public.tasks(id) ON DELETE CASCADE,
  display_order  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  text       TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id    UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.task_activity (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,  -- e.g. 'status_changed', 'priority_changed', 'assigned'
  old_value  TEXT,
  new_value  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────
CREATE INDEX idx_profiles_wedding_id    ON public.profiles(wedding_id);
CREATE INDEX idx_weddings_share_code    ON public.weddings(share_code);

CREATE INDEX idx_tasks_wedding_id       ON public.tasks(wedding_id);
CREATE INDEX idx_tasks_parent_task_id  ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_order            ON public.tasks(wedding_id, display_order);
CREATE INDEX idx_tasks_status           ON public.tasks(wedding_id, status);
CREATE INDEX idx_tasks_due_date         ON public.tasks(wedding_id, due_date);

CREATE INDEX idx_comments_task_id       ON public.comments(task_id);
CREATE INDEX idx_comments_user_id       ON public.comments(user_id);

CREATE INDEX idx_task_activity_task_id  ON public.task_activity(task_id);
CREATE INDEX idx_task_activity_user_id  ON public.task_activity(user_id);

-- ───────────────────────────────────────────────
-- Helper function — resolves current user's wedding
-- SECURITY DEFINER so it bypasses RLS on profiles
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_wedding_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wedding_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ───────────────────────────────────────────────
-- Triggers
-- ───────────────────────────────────────────────

-- Auto-update tasks.updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_task_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_updated_at();

-- Auto-create a bare profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────
-- Row Level Security — enable on every table
-- ───────────────────────────────────────────────
ALTER TABLE public.weddings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- ─── weddings ───────────────────────────────────
-- A user may see/edit the one wedding they belong to.
-- They may create a new wedding (before they have a wedding_id).

CREATE POLICY "weddings_select"
  ON public.weddings FOR SELECT
  USING (id = public.get_user_wedding_id());

CREATE POLICY "weddings_insert"
  ON public.weddings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "weddings_update"
  ON public.weddings FOR UPDATE
  USING (id = public.get_user_wedding_id());

-- ─── profiles ───────────────────────────────────
-- Users can see all profiles that share their wedding
-- (needed to display collaborator names).
-- Each user may only write their own profile row.

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR wedding_id = public.get_user_wedding_id()
  );

CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ─── tasks ──────────────────────────────────────
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  USING (wedding_id = public.get_user_wedding_id());

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  WITH CHECK (wedding_id = public.get_user_wedding_id());

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  USING (wedding_id = public.get_user_wedding_id());

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  USING (wedding_id = public.get_user_wedding_id());

-- ─── comments ───────────────────────────────────
-- Membership check: comment's task must belong to user's wedding.

CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE wedding_id = public.get_user_wedding_id()
    )
  );

CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE wedding_id = public.get_user_wedding_id()
    )
  );

-- Users may only delete their own comments.
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());

-- ─── task_activity ──────────────────────────────
CREATE POLICY "task_activity_select"
  ON public.task_activity FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE wedding_id = public.get_user_wedding_id()
    )
  );

CREATE POLICY "task_activity_insert"
  ON public.task_activity FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE wedding_id = public.get_user_wedding_id()
    )
  );

-- ───────────────────────────────────────────────
-- Supabase Realtime
-- Enroll tasks and comments so all collaborators
-- receive live INSERT / UPDATE / DELETE events.
-- ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
