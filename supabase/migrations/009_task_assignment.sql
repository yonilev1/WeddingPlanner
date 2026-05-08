-- 009_task_assignment.sql — Add assigned_to column to tasks
-- Run in Supabase SQL Editor

alter table tasks
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists tasks_assigned_to_idx on tasks(assigned_to);
