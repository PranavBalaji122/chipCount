-- Host-only: remove one closed session from history (all rows sharing snapshotted_at).
-- Reverses the net_profit adjustments that close_session applied for registered players.
create or replace function public.delete_session_at(
  p_game_id uuid,
  p_snapshotted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  rec record;
  v_player_rows int;
  v_guest_rows int;
begin
  select host_id into v_host_id from public.games where id = p_game_id for update;
  if v_host_id is null or v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  select count(*)::int into v_player_rows
  from public.session_snapshots
  where game_id = p_game_id and snapshotted_at = p_snapshotted_at;

  select count(*)::int into v_guest_rows
  from public.guest_session_snapshots
  where game_id = p_game_id and snapshotted_at = p_snapshotted_at;

  if v_player_rows = 0 and v_guest_rows = 0 then
    raise exception 'No session found for this timestamp';
  end if;

  for rec in
    select user_id, session_net
    from public.session_snapshots
    where game_id = p_game_id and snapshotted_at = p_snapshotted_at
  loop
    update public.profiles
    set net_profit = net_profit - rec.session_net
    where id = rec.user_id;
  end loop;

  delete from public.session_snapshots
  where game_id = p_game_id and snapshotted_at = p_snapshotted_at;

  delete from public.guest_session_snapshots
  where game_id = p_game_id and snapshotted_at = p_snapshotted_at;
end;
$$;

grant execute on function public.delete_session_at(uuid, timestamptz) to authenticated;
