-- Drop the original single-parameter close_session function.
-- Migration 00011 created close_session(p_game_id uuid) and migration 00012 added
-- a NEW overload close_session(p_game_id uuid, p_final_status text) instead of
-- replacing it (CREATE OR REPLACE only replaces matching signatures). Having both
-- causes PostgREST PGRST203: "could not choose the best candidate function".
drop function if exists public.close_session(p_game_id uuid);
