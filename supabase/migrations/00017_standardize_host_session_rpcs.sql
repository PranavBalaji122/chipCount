-- Standard host RPCs for web and native clients.
-- These keep close/reopen/end behavior server-side so clients do not duplicate
-- payout/debt mutation logic.

create or replace function public.close_session_with_debts(
  p_game_id uuid,
  p_final_status text default 'closed'
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_status public.game_status;
  v_now timestamptz := now();
  v_player_count int := 0;
  v_slippage numeric := 0;
  rec record;
  v_player_ids uuid[] := '{}';
  v_balances numeric[] := '{}';
  v_left int;
  v_right int;
  v_payment numeric;
begin
  if p_final_status not in ('closed', 'ended') then
    raise exception 'Invalid final status: %', p_final_status;
  end if;

  select host_id, status
    into v_host_id, v_status
  from public.games
  where id = p_game_id
  for update;

  if v_host_id is null then
    raise exception 'Game not found';
  end if;

  if v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  if v_status != 'active' then
    raise exception 'Only active games can be closed';
  end if;

  for rec in
    select user_id,
           coalesce(cash_in, 0) as cash_in,
           coalesce(cash_out, 0) as cash_out
    from public.game_players
    where game_id = p_game_id
      and status = 'approved'
  loop
    insert into public.session_snapshots (
      game_id,
      user_id,
      cash_in,
      cash_out,
      session_net,
      snapshotted_at
    )
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

  for rec in
    select name,
           coalesce(cash_in, 0) as cash_in,
           coalesce(cash_out, 0) as cash_out
    from public.game_guests
    where game_id = p_game_id
  loop
    insert into public.guest_session_snapshots (
      game_id,
      guest_name,
      cash_in,
      cash_out,
      session_net,
      snapshotted_at
    )
    values (
      p_game_id,
      rec.name,
      rec.cash_in,
      rec.cash_out,
      rec.cash_out - rec.cash_in,
      v_now
    );
  end loop;

  select count(*)::int,
         coalesce(sum(coalesce(cash_in, 0) - coalesce(cash_out, 0)), 0)
    into v_player_count, v_slippage
  from public.game_players
  where game_id = p_game_id
    and status = 'approved';

  if v_player_count >= 2 then
    for rec in
      select user_id,
             coalesce(cash_out, 0) - coalesce(cash_in, 0) + (v_slippage / v_player_count) as balance
      from public.game_players
      where game_id = p_game_id
        and status = 'approved'
      order by balance asc
    loop
      v_player_ids := array_append(v_player_ids, rec.user_id);
      v_balances := array_append(v_balances, rec.balance);
    end loop;

    v_left := 1;
    v_right := array_length(v_player_ids, 1);

    while v_left < v_right loop
      if v_balances[v_left] >= -0.000000001 then
        v_left := v_left + 1;
        continue;
      end if;

      if v_balances[v_right] <= 0.000000001 then
        v_right := v_right - 1;
        continue;
      end if;

      v_payment := least(-v_balances[v_left], v_balances[v_right]);

      if v_payment > 0.000000001 then
        insert into public.debts (game_id, creditor_id, debtor_id, amount)
        values (
          p_game_id,
          v_player_ids[v_right],
          v_player_ids[v_left],
          round(v_payment, 2)
        );

        v_balances[v_left] := v_balances[v_left] + v_payment;
        v_balances[v_right] := v_balances[v_right] - v_payment;
      end if;

      if abs(v_balances[v_left]) < 0.000000001 then
        v_left := v_left + 1;
      end if;

      if abs(v_balances[v_right]) < 0.000000001 then
        v_right := v_right - 1;
      end if;
    end loop;
  end if;

  update public.games
  set status = p_final_status::public.game_status,
      ended_at = case when p_final_status = 'ended' then v_now else ended_at end
  where id = p_game_id;

  return v_now;
end;
$$;

create or replace function public.reopen_session(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_status public.game_status;
begin
  select host_id, status
    into v_host_id, v_status
  from public.games
  where id = p_game_id
  for update;

  if v_host_id is null then
    raise exception 'Game not found';
  end if;

  if v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  if v_status != 'closed' then
    raise exception 'Only closed games can be reopened';
  end if;

  update public.game_players
  set cash_in = 0,
      cash_out = 0,
      requested_cash_in = 0,
      requested_cash_out = 0
  where game_id = p_game_id;

  delete from public.game_guests
  where game_id = p_game_id;

  update public.games
  set status = 'active',
      ended_at = null
  where id = p_game_id;
end;
$$;

create or replace function public.end_table(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_status public.game_status;
begin
  select host_id, status
    into v_host_id, v_status
  from public.games
  where id = p_game_id
  for update;

  if v_host_id is null then
    raise exception 'Game not found';
  end if;

  if v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  if v_status = 'active' then
    perform public.close_session_with_debts(p_game_id, 'ended');
    return;
  end if;

  if v_status = 'closed' then
    update public.games
    set status = 'ended',
        ended_at = now()
    where id = p_game_id;
    return;
  end if;

  raise exception 'Game is already ended';
end;
$$;

grant execute on function public.close_session_with_debts(uuid, text) to authenticated;
grant execute on function public.reopen_session(uuid) to authenticated;
grant execute on function public.end_table(uuid) to authenticated;
