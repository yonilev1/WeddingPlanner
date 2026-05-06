-- ============================================================
-- Wedding Planner — RPC: find wedding by share code
-- Needed because the SELECT policy on weddings requires the
-- user to already belong to a wedding, so a user joining for
-- the first time cannot query weddings directly.
-- SECURITY DEFINER bypasses RLS for this lookup only.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_wedding_by_share_code(p_share_code TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.weddings
  WHERE share_code = upper(p_share_code);
$$;
