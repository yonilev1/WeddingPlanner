-- Add budget_total column to weddings table
-- Run this in: Supabase Dashboard → SQL Editor

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS budget_total NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN public.weddings.budget_total IS 'Optional total wedding budget set by the couple';
