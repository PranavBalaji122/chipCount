-- RPC: Host closes a session. Snapshots current cash_in/cash_out for every approved
-- player into session_snapshots AND increments each player's profiles.net_profit.
-- Uses security definer so we can write to profiles (which only allows self-update via RLS).
create or replace function public.close_session(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  rec record;
begin
  -- Verify caller is the host
  select host_id into v_host_id from public.games where id = p_game_id for update;
  if v_host_id is null or v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  -- Snapshot each approved player and update their all-time net profit
  for rec in
    select user_id,
           coalesce(cash_in, 0)  as cash_in,
           coalesce(cash_out, 0) as cash_out
    from public.game_players
    where game_id = p_game_id
      and status = 'approved'
  loop
    -- Record the snapshot
    insert into public.session_snapshots (game_id, user_id, cash_in, cash_out, session_net)
    values (
      p_game_id,
      rec.user_id,
      rec.cash_in,
      rec.cash_out,
      rec.cash_out - rec.cash_in
    );

    -- Accumulate into the player's all-time net profit
    update public.profiles
    set net_profit = net_profit + (rec.cash_out - rec.cash_in)
    where id = rec.user_id;
  end loop;

  -- Mark game as closed
  update public.games
  set status = 'closed'
  where id = p_game_id;
end;
$$;
