-- Add per-player cash-in / cash-out request fields (idempotent)
alter table public.game_players
  add column if not exists requested_cash_in numeric not null default 0,
  add column if not exists requested_cash_out numeric not null default 0;

-- Initialize request fields to current values so there is no pending state by default
update public.game_players
set requested_cash_in = cash_in,
    requested_cash_out = cash_out
where requested_cash_in = 0
  and requested_cash_out = 0;

-- Allow pending players to update only their own request fields (not status or approved cash)
create policy if not exists "Pending players can update own requests"
  on public.game_players
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and cash_in = 0
    and cash_out = 0
  );

