-- Host-only table deletion for native and web clients.
-- Closed sessions update profiles.net_profit, so reverse those adjustments
-- before cascading the table's players, guests, snapshots, and debts.
create or replace function public.delete_table(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  rec record;
begin
  select host_id
    into v_host_id
  from public.games
  where id = p_game_id
  for update;

  if v_host_id is null then
    raise exception 'Game not found';
  end if;

  if v_host_id is distinct from auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  for rec in
    select user_id, sum(session_net) as recorded_net
    from public.session_snapshots
    where game_id = p_game_id
    group by user_id
  loop
    update public.profiles
    set net_profit = net_profit - rec.recorded_net
    where id = rec.user_id;
  end loop;

  delete from public.games
  where id = p_game_id;
end;
$$;

revoke all on function public.delete_table(uuid) from public;
grant execute on function public.delete_table(uuid) to authenticated;
