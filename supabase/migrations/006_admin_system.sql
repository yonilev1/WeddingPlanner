-- ============================================================
-- Wedding Planner — Admin System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ───────────────────────────────────────────────
-- Add role and member_status columns to profiles
-- ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  ADD COLUMN member_status TEXT NOT NULL DEFAULT 'active'
    CHECK (member_status IN ('pending', 'active'));

-- Backfill existing users as admins (no one loses access)
UPDATE public.profiles SET role = 'admin', member_status = 'active';

-- ───────────────────────────────────────────────
-- Helper function — check if user is wedding admin
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_wedding_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin'
  FROM public.profiles
  WHERE id = auth.uid() AND member_status = 'active';
$$;

-- ───────────────────────────────────────────────
-- Update get_user_wedding_id to exclude pending
-- Pending members cannot see wedding data
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_wedding_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wedding_id FROM public.profiles
  WHERE id = auth.uid() AND member_status = 'active';
$$;

-- ───────────────────────────────────────────────
-- Update RLS policies
-- ───────────────────────────────────────────────

-- weddings_update: only admins can update wedding details
DROP POLICY "weddings_update" ON public.weddings;
CREATE POLICY "weddings_update"
  ON public.weddings FOR UPDATE
  USING (id = public.get_user_wedding_id() AND public.is_wedding_admin());

-- tasks_delete: only admins can delete tasks
DROP POLICY "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  USING (wedding_id = public.get_user_wedding_id() AND public.is_wedding_admin());

-- comments_delete: user can delete own, or admin can delete any
DROP POLICY "comments_delete" ON public.comments;
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid() OR public.is_wedding_admin());

-- comments_update: user can update own, or admin can update any
CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid() OR public.is_wedding_admin());

-- profiles_update: user can update own, or admin can update same-wedding members
DROP POLICY "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR (public.is_wedding_admin() AND wedding_id = public.get_user_wedding_id())
  );
