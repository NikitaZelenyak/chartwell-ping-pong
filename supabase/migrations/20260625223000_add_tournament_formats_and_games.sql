alter table public.tournaments
add column if not exists format text not null default 'single_elimination';

alter table public.tournaments
drop constraint if exists tournaments_format_check;

alter table public.tournaments
add constraint tournaments_format_check
check (format in ('round_robin', 'single_elimination'));

create table if not exists public.tournament_games (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number integer not null default 1,
  game_number integer not null default 1,
  player_one_id uuid references public.profiles(id) on delete set null,
  player_two_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round_number, game_number),
  constraint tournament_games_round_check check (round_number > 0),
  constraint tournament_games_number_check check (game_number > 0),
  constraint tournament_games_status_check check (status in ('scheduled', 'completed')),
  constraint tournament_games_winner_check check (
    winner_id is null
    or winner_id = player_one_id
    or winner_id = player_two_id
  )
);

drop trigger if exists tournament_games_set_updated_at on public.tournament_games;
create trigger tournament_games_set_updated_at
before update on public.tournament_games
for each row execute function public.set_updated_at();

alter table public.tournament_games enable row level security;

drop policy if exists "Tournament games are visible to authenticated users" on public.tournament_games;
create policy "Tournament games are visible to authenticated users"
on public.tournament_games for select
to authenticated
using (true);

drop policy if exists "Organizers can create tournament games" on public.tournament_games;
create policy "Organizers can create tournament games"
on public.tournament_games for insert
to authenticated
with check (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_games.tournament_id
      and tournaments.organizer_id = auth.uid()
  )
);

drop policy if exists "Organizers can update tournament games" on public.tournament_games;
create policy "Organizers can update tournament games"
on public.tournament_games for update
to authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_games.tournament_id
      and tournaments.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_games.tournament_id
      and tournaments.organizer_id = auth.uid()
  )
);

drop policy if exists "Organizers can delete tournament games" on public.tournament_games;
create policy "Organizers can delete tournament games"
on public.tournament_games for delete
to authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_games.tournament_id
      and tournaments.organizer_id = auth.uid()
  )
);

create index if not exists tournament_games_tournament_idx
on public.tournament_games (tournament_id, round_number, game_number);
