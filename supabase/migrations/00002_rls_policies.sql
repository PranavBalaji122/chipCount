-- Helper function to check game membership without recursion
create or replace function public.is_player_in_game(p_game_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  set local row_security = off;
  return exists (
    select 1 from game_players
    where game_id = p_game_id and user_id = auth.uid()
  );
end;
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_profit_history enable row level security;

-- Drop old policies that will be replaced
drop policy if exists "Users can view game_players for games they are in" on public.game_players;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view public profiles" on public.profiles;
drop policy if exists "Host full access to own games" on public.games;
drop policy if exists "Anyone can view active or ended games they are in" on public.games;
drop policy if exists "Authenticated users can view active games for join" on public.games;
drop policy if exists "Users can insert own game_players row (request join)" on public.game_players;
drop policy if exists "Host can update game_players for their games" on public.game_players;
drop policy if exists "Approved players can update own cash in/out" on public.game_players;
drop policy if exists "Users can view own profit history" on public.game_profit_history;
drop policy if exists "Host can insert profit history for their ended games" on public.game_profit_history;

-- Profiles: users read/update own row; read others only if profile_public
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view public profiles"
  on public.profiles for select
  using (profile_public = true);

-- Games: host full access; others can read game by id and manage own game_players row
create policy "Host full access to own games"
  on public.games for all
  using (auth.uid() = host_id);

create policy "Anyone can view active or ended games they are in"
  on public.games for select
  using (public.is_player_in_game(id));

-- Authenticated users can view active games (for join-by-short_code flow)
create policy "Authenticated users can view active games for join"
  on public.games for select
  to authenticated
  using (status = 'active');

-- Game players: host can update any row (approve/deny, set cash); users can read game_players for games they're in; users can insert own row (request join)
create policy "Users can insert own game_players row (request join)"
  on public.game_players for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view game_players for games they are in"
  on public.game_players for select
  using (
    exists (
      select 1 from public.games g
      where g.id = game_players.game_id and g.host_id = auth.uid()
    ) or public.is_player_in_game(game_players.game_id)
  );

create policy "Host can update game_players for their games"
  on public.game_players for update
  using (
    exists (
      select 1 from public.games g
      where g.id = game_players.game_id and g.host_id = auth.uid()
    )
  );

-- Approved player can update own cash_in/cash_out (optional - plan says "host can add guest row" and "optionally allow editing own cash in/out")
create policy "Approved players can update own cash in/out"
  on public.game_players for update
  using (auth.uid() = user_id and status = 'approved');

-- Game profit history: users read own; insert only via backend or trigger when game ends
create policy "Users can view own profit history"
  on public.game_profit_history for select
  using (auth.uid() = user_id);

-- Service role or host will insert profit history when game ends; we need a policy that allows insert for game_players when game is ended. Actually the plan says "Only host can set status = 'ended'". So when host ends game, we need to: 1) update games set status = 'ended', 2) insert into game_profit_history for each player, 3) update profiles.net_profit. Steps 2 and 3 can be done in a database function called by the client with security definer, or we allow the host to insert into game_profit_history for their ended games. Easiest: create an RPC "end_game(game_id)" that does all of that, with security definer, and only the host can call it. That way we don't need insert policy on game_profit_history for clients. For now add policy: only host of the game can insert profit history for that game (when game is ended). So we need to allow insert where the game's host_id = auth.uid() and game status is ended. But when we insert we're setting user_id, game_id, profit_delta - we don't set "game status". So the flow is: 1) client updates game to ended, 2) client inserts into game_profit_history. So we need insert policy: user can insert into game_profit_history if the game is ended and (they are the host or they are the user_id being inserted). Actually the host inserts rows for all players. So: allow insert if auth.uid() = (select host_id from games where id = game_id). 
create policy "Host can insert profit history for their ended games"
  on public.game_profit_history for insert
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_id and g.host_id = auth.uid() and g.status = 'ended'
    )
  );
