-- Drop the obsolete close_session(uuid) function to resolve overload ambiguity
drop function if exists public.close_session(uuid);
