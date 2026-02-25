-- Alter the close_session RPC to calculate and store payouts
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
  v_payouts jsonb;
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
    insert into public.session_snapshots (game_id, user_id, cash_in, cash_out, session_net)
    values (
      p_game_id,
      rec.user_id,
      rec.cash_in,
      rec.cash_out,
      rec.cash_out - rec.cash_in
    );

    update public.profiles
    set net_profit = net_profit + (rec.cash_out - rec.cash_in)
    where id = rec.user_id;
  end loop;

  -- Calculate payouts
  with players as (
    select
      p.user_id,
      pr.display_name as name,
      coalesce(p.cash_in, 0) as cash_in,
      coalesce(p.cash_out, 0) as cash_out,
      coalesce(p.cash_out, 0) - coalesce(p.cash_in, 0) as net
    from public.game_players p
    join public.profiles pr on p.user_id = pr.id
    where p.game_id = p_game_id and p.status = 'approved'
  ),
  total_in as (
    select sum(cash_in) as value from players
  ),
  total_out as (
    select sum(cash_out) as value from players
  ),
  slippage as (
    select total_out.value - total_in.value as value from total_in, total_out
  ),
  payout_calcs as (
    select
      jsonb_agg(
        jsonb_build_object(
          'name', p.name,
          'net', p.net,
          'venmo', pr.venmo_handle
        )
      ) as players,
      (select value from slippage) as slippage
    from players p
    join public.profiles pr on p.user_id = pr.id
  )
  select
    jsonb_build_object(
      'players', players,
      'slippage', slippage
    )
  into v_payouts
  from payout_calcs;

  -- a new version number can be determined by incrementing the max session_number for the game
  insert into public.session_payouts (game_id, session_number, payouts)
  values (
    p_game_id,
    (select coalesce(max(session_number), 0) + 1 from public.session_payouts where game_id = p_game_id),
    v_payouts
  );

  -- Set the requested final status
  update public.games
  set status = p_final_status::game_status
  where id = p_game_id;
end;
$$;
