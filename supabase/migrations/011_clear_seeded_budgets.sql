-- 011_clear_seeded_budgets.sql
-- Clears any seeded budget estimates so users start with empty cost fields
-- This ensures users decide their own budget allocations
-- Run in Supabase SQL Editor

UPDATE public.tasks
SET estimated_cost = NULL, actual_cost = NULL
WHERE estimated_cost IS NOT NULL OR actual_cost IS NOT NULL;
