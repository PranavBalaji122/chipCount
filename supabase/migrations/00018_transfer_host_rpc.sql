-- Host-only transfer to an approved player.
create or replace function public.transfer_host(
  p_game_id uuid,
  p_new_host_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_new_host_status public.game_player_status;
begin
  select host_id
    into v_host_id
  from public.games
  where id = p_game_id
  for update;

  if v_host_id is null then
    raise exception 'Game not found';
  end if;

  if v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  if p_new_host_id = v_host_id then
    raise exception 'Player is already the host';
  end if;

  select status
    into v_new_host_status
  from public.game_players
  where game_id = p_game_id
    and user_id = p_new_host_id;

  if v_new_host_status is distinct from 'approved' then
    raise exception 'New host must be an approved player';
  end if;

  update public.games
  set host_id = p_new_host_id
  where id = p_game_id;
end;
$$;

grant execute on function public.transfer_host(uuid, uuid) to authenticated;
