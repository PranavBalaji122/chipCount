-- Read-only spectator access for invite links (anon + authenticated)
create or replace function public.get_spectator_game(p_short_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_result json;
begin
  select id, short_code, description, status
  into v_game
  from public.games
  where lower(trim(short_code)) = lower(trim(p_short_code))
    and status in ('active', 'closed');

  if not found then
    return null;
  end if;

  select json_build_object(
    'game', json_build_object(
      'id', v_game.id,
      'short_code', v_game.short_code,
      'description', v_game.description,
      'status', v_game.status
    ),
    'players', coalesce((
      select json_agg(
        json_build_object(
          'display_name', coalesce(gp.display_name, pr.display_name),
          'status', gp.status,
          'cash_in', coalesce(gp.cash_in, 0),
          'cash_out', coalesce(gp.cash_out, 0),
          'venmo_handle', pr.venmo_handle
        )
      )
      from (
        select gp.display_name, gp.status, gp.cash_in, gp.cash_out, gp.user_id
        from public.game_players gp
        where gp.game_id = v_game.id
        order by gp.status, coalesce(gp.display_name, gp.user_id::text)
      ) gp
      left join public.profiles pr on pr.id = gp.user_id
    ), '[]'::json),
    'guests', coalesce((
      select json_agg(
        json_build_object(
          'name', gg.name,
          'cash_in', coalesce(gg.cash_in, 0),
          'cash_out', coalesce(gg.cash_out, 0)
        )
      )
      from (
        select name, cash_in, cash_out
        from public.game_guests
        where game_id = v_game.id
        order by name
      ) gg
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_spectator_game(text) to anon, authenticated;
