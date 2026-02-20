-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  email text,
  venmo_handle text,
  net_profit numeric not null default 0,
  profile_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Games
create type game_status as enum ('active', 'ended');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null default '',
  host_id uuid not null references public.profiles (id) on delete cascade,
  description text,
  status game_status not null default 'active',
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create or replace function set_game_short_code()
returns trigger as $$
begin
  new.short_code := lower(substring(replace(new.id::text, '-', '') from 1 for 8));
  return new;
end;
$$ language plpgsql;

create trigger games_short_code
  before insert on public.games
  for each row execute function set_game_short_code();

-- Game players
create type game_player_status as enum ('pending', 'approved', 'denied');

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status game_player_status not null default 'pending',
  cash_in numeric not null default 0,
  cash_out numeric not null default 0,
  display_name text,
  primary key (game_id, user_id)
);

-- Game profit history (for net profit over time graph)
create table public.game_profit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  profit_delta numeric not null,
  recorded_at timestamptz not null default now()
);

create index idx_game_profit_history_user on public.game_profit_history (user_id, recorded_at);
create index idx_games_host_status on public.games (host_id, status);
create index idx_game_players_game on public.game_players (game_id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at for profiles
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
