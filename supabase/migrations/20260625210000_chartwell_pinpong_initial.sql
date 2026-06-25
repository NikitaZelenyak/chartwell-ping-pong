create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  handle text unique,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  preferred_hand text,
  home_club text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_rating_check check (rating >= 0),
  constraint profiles_wins_check check (wins >= 0),
  constraint profiles_losses_check check (losses >= 0)
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  venue text,
  starts_at timestamptz,
  max_players integer not null default 16,
  skill_floor integer not null default 900,
  skill_ceiling integer not null default 2400,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_status_check check (status in ('draft', 'open', 'running', 'completed', 'cancelled')),
  constraint tournaments_max_players_check check (max_players >= 2),
  constraint tournaments_rating_range_check check (skill_floor <= skill_ceiling)
);

create table if not exists public.tournament_entries (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered',
  seed integer,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id),
  constraint tournament_entries_status_check check (status in ('registered', 'checked_in', 'withdrawn', 'eliminated', 'winner'))
);

create table if not exists public.match_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for timestamptz,
  location text,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_invites_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  constraint match_invites_distinct_players check (created_by <> opponent_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  invite_id uuid references public.match_invites(id) on delete set null,
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  winner_id uuid not null references public.profiles(id) on delete cascade,
  loser_id uuid not null references public.profiles(id) on delete cascade,
  player_one_score integer not null default 0,
  player_two_score integer not null default 0,
  score_summary text,
  rating_delta integer not null,
  created_at timestamptz not null default now(),
  constraint matches_distinct_players check (player_one_id <> player_two_id),
  constraint matches_winner_check check (winner_id in (player_one_id, player_two_id)),
  constraint matches_loser_check check (loser_id in (player_one_id, player_two_id) and loser_id <> winner_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

drop trigger if exists match_invites_set_updated_at on public.match_invites;
create trigger match_invites_set_updated_at
before update on public.match_invites
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.report_match(
  p_player_one uuid,
  p_player_two uuid,
  p_winner uuid,
  p_player_one_score integer,
  p_player_two_score integer,
  p_score_summary text default null,
  p_tournament_id uuid default null,
  p_invite_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user uuid := auth.uid();
  v_loser uuid;
  v_player_one_rating integer;
  v_player_two_rating integer;
  v_winner_rating integer;
  v_loser_rating integer;
  v_expected numeric;
  v_delta integer;
  v_match_id uuid;
begin
  if v_current_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_current_user <> p_player_one then
    raise exception 'Only the reporting player can submit this result';
  end if;

  if p_player_one = p_player_two then
    raise exception 'Players must be different';
  end if;

  if p_winner not in (p_player_one, p_player_two) then
    raise exception 'Winner must be one of the players';
  end if;

  v_loser := case when p_winner = p_player_one then p_player_two else p_player_one end;

  select rating into v_player_one_rating
  from public.profiles
  where id = p_player_one;

  select rating into v_player_two_rating
  from public.profiles
  where id = p_player_two;

  if v_player_one_rating is null or v_player_two_rating is null then
    raise exception 'Both players need profiles before reporting a match';
  end if;

  v_winner_rating := case
    when p_winner = p_player_one then v_player_one_rating
    else v_player_two_rating
  end;

  v_loser_rating := case
    when v_loser = p_player_one then v_player_one_rating
    else v_player_two_rating
  end;

  v_expected := 1 / (1 + power(10, (v_loser_rating - v_winner_rating)::numeric / 400));
  v_delta := greatest(1, round(32 * (1 - v_expected))::integer);

  update public.profiles
  set rating = rating + v_delta,
      wins = wins + 1
  where id = p_winner;

  update public.profiles
  set rating = greatest(0, rating - v_delta),
      losses = losses + 1
  where id = v_loser;

  insert into public.matches (
    tournament_id,
    invite_id,
    player_one_id,
    player_two_id,
    winner_id,
    loser_id,
    player_one_score,
    player_two_score,
    score_summary,
    rating_delta
  )
  values (
    p_tournament_id,
    p_invite_id,
    p_player_one,
    p_player_two,
    p_winner,
    v_loser,
    greatest(0, coalesce(p_player_one_score, 0)),
    greatest(0, coalesce(p_player_two_score, 0)),
    nullif(trim(p_score_summary), ''),
    v_delta
  )
  returning id into v_match_id;

  if p_invite_id is not null then
    update public.match_invites
    set status = 'completed'
    where id = p_invite_id
      and status = 'accepted'
      and created_by in (p_player_one, p_player_two)
      and opponent_id in (p_player_one, p_player_two);
  end if;

  return v_match_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.match_invites enable row level security;
alter table public.matches enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Tournaments are visible to authenticated users" on public.tournaments;
create policy "Tournaments are visible to authenticated users"
on public.tournaments for select
to authenticated
using (true);

drop policy if exists "Users can create tournaments" on public.tournaments;
create policy "Users can create tournaments"
on public.tournaments for insert
to authenticated
with check (organizer_id = auth.uid());

drop policy if exists "Organizers can update tournaments" on public.tournaments;
create policy "Organizers can update tournaments"
on public.tournaments for update
to authenticated
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

drop policy if exists "Entries are visible to authenticated users" on public.tournament_entries;
create policy "Entries are visible to authenticated users"
on public.tournament_entries for select
to authenticated
using (true);

drop policy if exists "Users can register themselves" on public.tournament_entries;
create policy "Users can register themselves"
on public.tournament_entries for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their tournament entry" on public.tournament_entries;
create policy "Users can update their tournament entry"
on public.tournament_entries for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Invite participants can view invites" on public.match_invites;
create policy "Invite participants can view invites"
on public.match_invites for select
to authenticated
using (created_by = auth.uid() or opponent_id = auth.uid());

drop policy if exists "Users can send match invites" on public.match_invites;
create policy "Users can send match invites"
on public.match_invites for insert
to authenticated
with check (created_by = auth.uid() and opponent_id <> auth.uid());

drop policy if exists "Invite participants can update invites" on public.match_invites;
create policy "Invite participants can update invites"
on public.match_invites for update
to authenticated
using (created_by = auth.uid() or opponent_id = auth.uid())
with check (created_by = auth.uid() or opponent_id = auth.uid());

drop policy if exists "Matches are visible to authenticated users" on public.matches;
create policy "Matches are visible to authenticated users"
on public.matches for select
to authenticated
using (true);

create index if not exists profiles_rating_idx on public.profiles (rating desc);
create index if not exists tournaments_starts_at_idx on public.tournaments (starts_at);
create index if not exists match_invites_created_by_idx on public.match_invites (created_by);
create index if not exists match_invites_opponent_id_idx on public.match_invites (opponent_id);
create index if not exists matches_created_at_idx on public.matches (created_at desc);
