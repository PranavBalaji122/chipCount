-- Persistent guest players per game (host-only CRUD)
create table public.game_guests (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  cash_in numeric not null default 0,
  cash_out numeric not null default 0,
  created_at timestamptz not null default now()
);

create index idx_game_guests_game on public.game_guests (game_id);

-- Snapshot table for guest players (mirrors session_snapshots but with guest_name)
create table public.guest_session_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  guest_name text not null,
  cash_in numeric not null default 0,
  cash_out numeric not null default 0,
  session_net numeric not null default 0,
  snapshotted_at timestamptz not null default now()
);

create index idx_guest_session_snapshots_game on public.guest_session_snapshots (game_id, snapshotted_at);

-- RLS for game_guests
alter table public.game_guests enable row level security;

create policy "Host can manage guests"
  on public.game_guests for all
  using (
    auth.uid() in (select host_id from public.games where id = game_guests.game_id)
  )
  with check (
    auth.uid() in (select host_id from public.games where id = game_guests.game_id)
  );

create policy "Participants can view guests"
  on public.game_guests for select
  using (
    public.is_player_in_game(game_id)
  );

-- RLS for guest_session_snapshots
alter table public.guest_session_snapshots enable row level security;

create policy "Participants can view guest session snapshots"
  on public.guest_session_snapshots for select
  using (
    auth.uid() in (
      select user_id from public.game_players where game_id = guest_session_snapshots.game_id
    ) or
    auth.uid() in (
      select host_id from public.games where id = guest_session_snapshots.game_id
    )
  );

create policy "Host can insert guest session snapshots"
  on public.guest_session_snapshots for insert
  with check (
    auth.uid() in (
      select host_id from public.games where id = guest_session_snapshots.game_id
    )
  );

-- Update close_session to also snapshot guest players
create or replace function public.close_session(
  p_game_id      uuid,
  p_final_status text default 'closed'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  rec record;
  guest_rec record;
  v_now timestamptz := now();
begin
  select host_id into v_host_id from public.games where id = p_game_id for update;
  if v_host_id is null or v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  -- Snapshot each approved player
  for rec in
    select user_id,
           coalesce(cash_in, 0)  as cash_in,
           coalesce(cash_out, 0) as cash_out
    from public.game_players
    where game_id = p_game_id
      and status = 'approved'
  loop
    insert into public.session_snapshots (game_id, user_id, cash_in, cash_out, session_net, snapshotted_at)
    values (
      p_game_id,
      rec.user_id,
      rec.cash_in,
      rec.cash_out,
      rec.cash_out - rec.cash_in,
      v_now
    );

    update public.profiles
    set net_profit = net_profit + (rec.cash_out - rec.cash_in)
    where id = rec.user_id;
  end loop;

  -- Snapshot each guest player
  for guest_rec in
    select name,
           coalesce(cash_in, 0)  as cash_in,
           coalesce(cash_out, 0) as cash_out
    from public.game_guests
    where game_id = p_game_id
  loop
    insert into public.guest_session_snapshots (game_id, guest_name, cash_in, cash_out, session_net, snapshotted_at)
    values (
      p_game_id,
      guest_rec.name,
      guest_rec.cash_in,
      guest_rec.cash_out,
      guest_rec.cash_out - guest_rec.cash_in,
      v_now
    );
  end loop;

  update public.games
  set status = p_final_status::game_status
  where id = p_game_id;
end;
$$;
