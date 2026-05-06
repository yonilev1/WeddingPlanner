-- ============================================================
-- Wedding Planner — Add cost columns to tasks
-- Required for the Budget panel and Task Detail Drawer to save
-- estimated and actual costs per task.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS actual_cost    NUMERIC(12, 2);
