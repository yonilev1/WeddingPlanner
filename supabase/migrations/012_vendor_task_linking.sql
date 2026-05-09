-- 012_vendor_task_linking.sql
-- Links vendors to category tasks for budget integration
-- Run in Supabase SQL Editor

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Index for fast vendor lookups by task
CREATE INDEX IF NOT EXISTS vendors_task_id_idx ON vendors(task_id);
