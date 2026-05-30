begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'host@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'player@example.com');

insert into public.games (id, host_id, description)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Deletion test'
);

insert into public.game_players (game_id, user_id, status)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'approved'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'approved'
  );

update public.profiles
set net_profit = case
  when id = '00000000-0000-0000-0000-000000000001' then 30
  else -30
end
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

insert into public.session_snapshots (
  game_id,
  user_id,
  cash_in,
  cash_out,
  session_net,
  snapshotted_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    20,
    50,
    30,
    '2026-05-30 12:00:00+00'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    50,
    20,
    -30,
    '2026-05-30 12:00:00+00'
  );

insert into public.guest_session_snapshots (
  game_id,
  guest_name,
  cash_in,
  cash_out,
  session_net,
  snapshotted_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Guest',
  10,
  10,
  0,
  '2026-05-30 12:00:00+00'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

select lives_ok(
  $$ select public.delete_session_at(
    '10000000-0000-0000-0000-000000000001',
    '2026-05-30 12:00:00+00'
  ) $$,
  'the host can delete a session'
);

select is(
  (
    select count(*)::integer
    from public.session_snapshots
    where game_id = '10000000-0000-0000-0000-000000000001'
  ),
  0,
  'registered-player snapshots are deleted'
);

select is(
  (
    select count(*)::integer
    from public.guest_session_snapshots
    where game_id = '10000000-0000-0000-0000-000000000001'
  ),
  0,
  'guest snapshots are deleted'
);

select is(
  (
    select net_profit
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000001'
  ),
  0::numeric,
  'the host profit is rolled back'
);

select is(
  (
    select net_profit
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000002'
  ),
  0::numeric,
  'the player profit is rolled back'
);

select throws_ok(
  $$ select public.delete_session_at(
    '10000000-0000-0000-0000-000000000001',
    '2026-05-30 12:00:00+00'
  ) $$,
  'No session found for this timestamp',
  'a deleted session cannot be deleted twice'
);

set local role anon;

select throws_ok(
  $$ select public.delete_session_at(
    '10000000-0000-0000-0000-000000000001',
    '2026-05-30 12:00:00+00'
  ) $$,
  'permission denied for function delete_session_at',
  'anonymous callers cannot execute the deletion RPC'
);

select * from finish();
rollback;
