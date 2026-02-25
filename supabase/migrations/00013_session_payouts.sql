create table public.session_payouts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  session_number integer not null,
  created_at timestamptz not null default now(),
  payouts jsonb not null
);

create index idx_session_payouts_game on public.session_payouts (game_id, session_number);

alter table public.session_payouts enable row level security;

create policy "Participants can view session payouts"
  on public.session_payouts for select
  using (
    auth.uid() in (
      select user_id from public.game_players where game_id = session_payouts.game_id
    ) or
    auth.uid() in (
      select host_id from public.games where id = session_payouts.game_id
    )
  );

create policy "Host can insert session payouts"
  on public.session_payouts for insert
  with check (
    auth.uid() in (
      select host_id from public.games where id = session_payouts.game_id
    )
  );
