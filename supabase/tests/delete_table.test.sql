begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'host@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'player@example.com');

insert into public.games (id, host_id, description)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Deletion test'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Authorization test'
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

insert into public.game_guests (game_id, name, cash_in, cash_out)
values (
  '10000000-0000-0000-0000-000000000001',
  'Guest',
  10,
  10
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

insert into public.debts (game_id, creditor_id, debtor_id, amount)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  30
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

select lives_ok(
  $$ select public.delete_table('10000000-0000-0000-0000-000000000001') $$,
  'the host can delete a table'
);

select is(
  (select count(*)::integer from public.games where id = '10000000-0000-0000-0000-000000000001'),
  0,
  'the game is deleted'
);

select is(
  (select count(*)::integer from public.game_players where game_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'registered players are deleted'
);

select is(
  (select count(*)::integer from public.game_guests where game_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'guests are deleted'
);

select is(
  (select count(*)::integer from public.session_snapshots where game_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'registered-player snapshots are deleted'
);

select is(
  (select count(*)::integer from public.guest_session_snapshots where game_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'guest snapshots are deleted'
);

select is(
  (select count(*)::integer from public.debts where game_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'debts are deleted'
);

select ok(
  (
    select bool_and(net_profit = 0)
    from public.profiles
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  ),
  'profile totals are rolled back'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$ select public.delete_table('10000000-0000-0000-0000-000000000002') $$,
  'Not the host of this game',
  'non-host callers cannot delete a table'
);

select * from finish();
rollback;
