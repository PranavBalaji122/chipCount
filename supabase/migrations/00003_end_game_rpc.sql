-- RPC: Host ends game and applies profit deltas (client computes calcPayouts and passes deltas)
create or replace function public.end_game(
  p_game_id uuid,
  p_profit_deltas jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb;
  v_host_id uuid;
begin
  select host_id into v_host_id from public.games where id = p_game_id for update;
  if v_host_id is null or v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  update public.games
  set status = 'ended', ended_at = now()
  where id = p_game_id;

  for rec in select * from jsonb_array_elements(p_profit_deltas)
  loop
    insert into public.game_profit_history (user_id, game_id, profit_delta)
    values (
      (rec->>'user_id')::uuid,
      p_game_id,
      (rec->>'profit_delta')::numeric
    );
    update public.profiles
    set net_profit = net_profit + (rec->>'profit_delta')::numeric
    where id = (rec->>'user_id')::uuid;
  end loop;
end;
$$;
