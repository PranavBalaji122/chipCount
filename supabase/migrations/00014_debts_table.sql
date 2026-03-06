-- Debts table: tracks money owed between registered players after a game ends.
-- Debts are inserted automatically by insert_game_debts() when closeGame runs.
-- Guests are excluded (no profile row).

create table if not exists public.debts (
  id           uuid        primary key default gen_random_uuid(),
  game_id      uuid        not null references public.games(id)    on delete cascade,
  creditor_id  uuid        not null references public.profiles(id) on delete cascade,
  debtor_id    uuid        not null references public.profiles(id) on delete cascade,
  amount       numeric     not null,
  status       text        not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_debts_creditor on public.debts (creditor_id);
create index if not exists idx_debts_debtor   on public.debts (debtor_id);
create index if not exists idx_debts_game     on public.debts (game_id);

alter table public.debts enable row level security;

-- Users can see their own debts (as creditor or debtor)
drop policy if exists "Users can view own debts" on public.debts;
create policy "Users can view own debts"
  on public.debts for select
  using (auth.uid() = creditor_id or auth.uid() = debtor_id);

-- Only the creditor can settle (update) a debt
drop policy if exists "Creditor can settle debts" on public.debts;
create policy "Creditor can settle debts"
  on public.debts for update
  using (auth.uid() = creditor_id)
  with check (auth.uid() = creditor_id);

-- No INSERT policy for authenticated users.
-- Debts are inserted via the security-definer function below.

-- insert_game_debts: accepts pre-computed payout data and inserts debt rows.
-- Security definer so it can bypass the INSERT RLS restriction.
-- Appends new debts on every game close; only players can remove debts via settle.
create or replace function public.insert_game_debts(
  p_game_id uuid,
  p_debts   jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id  uuid;
  debt_item  jsonb;
begin
  -- Verify the caller is the host
  select host_id into v_host_id from public.games where id = p_game_id;
  if v_host_id is null or v_host_id != auth.uid() then
    raise exception 'Not the host of this game';
  end if;

  -- Insert each debt record
  for debt_item in select * from jsonb_array_elements(p_debts)
  loop
    insert into public.debts (game_id, creditor_id, debtor_id, amount)
    values (
      p_game_id,
      (debt_item->>'creditor_id')::uuid,
      (debt_item->>'debtor_id')::uuid,
      (debt_item->>'amount')::numeric
    );
  end loop;
end;
$$;
