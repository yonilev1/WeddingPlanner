-- Add budget tracking columns to tasks
-- Run this in the Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_cost numeric(10,2) DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_cost numeric(10,2) DEFAULT NULL;

COMMENT ON COLUMN tasks.estimated_cost IS 'Estimated cost for this task in the couple''s currency';
COMMENT ON COLUMN tasks.actual_cost IS 'Actual amount spent on this task';
