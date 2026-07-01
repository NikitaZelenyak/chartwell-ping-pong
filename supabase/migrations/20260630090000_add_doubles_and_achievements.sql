alter table public.profiles
add column if not exists doubles_rating integer not null default 1000,
add column if not exists doubles_wins integer not null default 0,
add column if not exists doubles_losses integer not null default 0;

alter table public.profiles
drop constraint if exists profiles_doubles_rating_check;

alter table public.profiles
add constraint profiles_doubles_rating_check check (doubles_rating >= 0);

alter table public.profiles
drop constraint if exists profiles_doubles_wins_check;

alter table public.profiles
add constraint profiles_doubles_wins_check check (doubles_wins >= 0);

alter table public.profiles
drop constraint if exists profiles_doubles_losses_check;

alter table public.profiles
add constraint profiles_doubles_losses_check check (doubles_losses >= 0);

create table if not exists public.doubles_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_one_id, player_two_id),
  constraint doubles_teams_distinct_players check (player_one_id <> player_two_id),
  constraint doubles_teams_ordered_players check (player_one_id < player_two_id),
  constraint doubles_teams_rating_check check (rating >= 0),
  constraint doubles_teams_wins_check check (wins >= 0),
  constraint doubles_teams_losses_check check (losses >= 0)
);

create table if not exists public.doubles_team_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  team_name text not null,
  status text not null default 'pending',
  accepted_team_id uuid references public.doubles_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doubles_team_invites_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint doubles_team_invites_distinct_players check (created_by <> invited_user_id and player_one_id <> player_two_id),
  constraint doubles_team_invites_ordered_players check (player_one_id < player_two_id)
);

create table if not exists public.doubles_match_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  team_one_id uuid not null references public.doubles_teams(id) on delete cascade,
  team_two_id uuid not null references public.doubles_teams(id) on delete cascade,
  winner_team_id uuid not null references public.doubles_teams(id) on delete cascade,
  responder_team_id uuid not null references public.doubles_teams(id) on delete cascade,
  team_one_score integer not null default 0,
  team_two_score integer not null default 0,
  score_summary text,
  status text not null default 'pending',
  confirmed_match_id uuid,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doubles_match_reports_status_check check (status in ('pending', 'confirmed', 'declined')),
  constraint doubles_match_reports_distinct_teams check (team_one_id <> team_two_id),
  constraint doubles_match_reports_winner_check check (winner_team_id in (team_one_id, team_two_id)),
  constraint doubles_match_reports_responder_check check (responder_team_id in (team_one_id, team_two_id)),
  constraint doubles_match_reports_scores_check check (team_one_score >= 0 and team_two_score >= 0)
);

create table if not exists public.doubles_matches (
  id uuid primary key default gen_random_uuid(),
  team_one_id uuid not null references public.doubles_teams(id) on delete cascade,
  team_two_id uuid not null references public.doubles_teams(id) on delete cascade,
  winner_team_id uuid not null references public.doubles_teams(id) on delete cascade,
  loser_team_id uuid not null references public.doubles_teams(id) on delete cascade,
  team_one_score integer not null default 0,
  team_two_score integer not null default 0,
  score_summary text,
  team_rating_delta integer not null,
  player_rating_delta integer not null,
  report_id uuid references public.doubles_match_reports(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint doubles_matches_distinct_teams check (team_one_id <> team_two_id),
  constraint doubles_matches_winner_check check (winner_team_id in (team_one_id, team_two_id)),
  constraint doubles_matches_loser_check check (loser_team_id in (team_one_id, team_two_id) and loser_team_id <> winner_team_id)
);

alter table public.doubles_match_reports
drop constraint if exists doubles_match_reports_confirmed_match_fkey;

alter table public.doubles_match_reports
add constraint doubles_match_reports_confirmed_match_fkey
foreign key (confirmed_match_id) references public.doubles_matches(id) on delete set null;

create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  source_type text,
  source_id uuid,
  awarded_at timestamptz not null default now(),
  unique (profile_id, achievement_key)
);

drop trigger if exists doubles_teams_set_updated_at on public.doubles_teams;
create trigger doubles_teams_set_updated_at
before update on public.doubles_teams
for each row execute function public.set_updated_at();

drop trigger if exists doubles_team_invites_set_updated_at on public.doubles_team_invites;
create trigger doubles_team_invites_set_updated_at
before update on public.doubles_team_invites
for each row execute function public.set_updated_at();

drop trigger if exists doubles_match_reports_set_updated_at on public.doubles_match_reports;
create trigger doubles_match_reports_set_updated_at
before update on public.doubles_match_reports
for each row execute function public.set_updated_at();

alter table public.doubles_teams enable row level security;
alter table public.doubles_team_invites enable row level security;
alter table public.doubles_match_reports enable row level security;
alter table public.doubles_matches enable row level security;
alter table public.profile_achievements enable row level security;

drop policy if exists "Doubles teams are visible to authenticated users" on public.doubles_teams;
create policy "Doubles teams are visible to authenticated users"
on public.doubles_teams for select
to authenticated
using (true);

drop policy if exists "Team members can create doubles teams" on public.doubles_teams;
create policy "Team members can create doubles teams"
on public.doubles_teams for insert
to authenticated
with check (
  auth.uid() in (player_one_id, player_two_id)
  and created_by in (player_one_id, player_two_id)
);

drop policy if exists "Team members can update doubles teams" on public.doubles_teams;
create policy "Team members can update doubles teams"
on public.doubles_teams for update
to authenticated
using (auth.uid() in (player_one_id, player_two_id))
with check (auth.uid() in (player_one_id, player_two_id));

drop policy if exists "Team invite participants can view invites" on public.doubles_team_invites;
create policy "Team invite participants can view invites"
on public.doubles_team_invites for select
to authenticated
using (auth.uid() in (created_by, invited_user_id));

drop policy if exists "Users can create team invites" on public.doubles_team_invites;
create policy "Users can create team invites"
on public.doubles_team_invites for insert
to authenticated
with check (created_by = auth.uid() and invited_user_id <> auth.uid());

drop policy if exists "Team invite participants can update invites" on public.doubles_team_invites;
create policy "Team invite participants can update invites"
on public.doubles_team_invites for update
to authenticated
using (auth.uid() in (created_by, invited_user_id))
with check (auth.uid() in (created_by, invited_user_id));

drop policy if exists "Team invite participants can delete invites" on public.doubles_team_invites;
create policy "Team invite participants can delete invites"
on public.doubles_team_invites for delete
to authenticated
using (auth.uid() in (created_by, invited_user_id));

drop policy if exists "Doubles reports are visible to involved team members" on public.doubles_match_reports;
create policy "Doubles reports are visible to involved team members"
on public.doubles_match_reports for select
to authenticated
using (
  exists (
    select 1 from public.doubles_teams
    where doubles_teams.id in (doubles_match_reports.team_one_id, doubles_match_reports.team_two_id)
      and auth.uid() in (doubles_teams.player_one_id, doubles_teams.player_two_id)
  )
);

drop policy if exists "Team members can create doubles reports" on public.doubles_match_reports;
create policy "Team members can create doubles reports"
on public.doubles_match_reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.doubles_teams
    where doubles_teams.id in (team_one_id, team_two_id)
      and auth.uid() in (doubles_teams.player_one_id, doubles_teams.player_two_id)
  )
);

drop policy if exists "Responder team can update doubles reports" on public.doubles_match_reports;
create policy "Responder team can update doubles reports"
on public.doubles_match_reports for update
to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.doubles_teams
    where doubles_teams.id = responder_team_id
      and auth.uid() in (doubles_teams.player_one_id, doubles_teams.player_two_id)
  )
)
with check (
  exists (
    select 1 from public.doubles_teams
    where doubles_teams.id = responder_team_id
      and auth.uid() in (doubles_teams.player_one_id, doubles_teams.player_two_id)
  )
);

drop policy if exists "Doubles matches are visible to authenticated users" on public.doubles_matches;
create policy "Doubles matches are visible to authenticated users"
on public.doubles_matches for select
to authenticated
using (true);

drop policy if exists "Achievements are visible to authenticated users" on public.profile_achievements;
create policy "Achievements are visible to authenticated users"
on public.profile_achievements for select
to authenticated
using (true);

create index if not exists doubles_teams_rating_idx
on public.doubles_teams (rating desc);

create index if not exists doubles_team_invites_created_by_idx
on public.doubles_team_invites (created_by, status, created_at desc);

create index if not exists doubles_team_invites_invited_user_idx
on public.doubles_team_invites (invited_user_id, status, created_at desc);

create index if not exists doubles_match_reports_team_idx
on public.doubles_match_reports (team_one_id, team_two_id, status, created_at desc);

create index if not exists doubles_matches_created_at_idx
on public.doubles_matches (created_at desc);

create index if not exists profile_achievements_profile_idx
on public.profile_achievements (profile_id, awarded_at desc);

create or replace function public.award_profile_achievement(
  p_profile_id uuid,
  p_achievement_key text,
  p_source_type text default null,
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_achievements (
    profile_id,
    achievement_key,
    source_type,
    source_id
  )
  values (
    p_profile_id,
    p_achievement_key,
    nullif(trim(coalesce(p_source_type, '')), ''),
    p_source_id
  )
  on conflict (profile_id, achievement_key) do nothing;
end;
$$;

create or replace function public.confirm_doubles_match_report(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.doubles_match_reports%rowtype;
  v_current_user uuid := auth.uid();
  v_team_one public.doubles_teams%rowtype;
  v_team_two public.doubles_teams%rowtype;
  v_winner public.doubles_teams%rowtype;
  v_loser public.doubles_teams%rowtype;
  v_winner_avg numeric;
  v_loser_avg numeric;
  v_team_expected numeric;
  v_player_expected numeric;
  v_team_delta integer;
  v_player_delta integer;
  v_match_id uuid;
begin
  if v_current_user is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_report
  from public.doubles_match_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Doubles match report not found.';
  end if;

  if v_report.status <> 'pending' then
    raise exception 'Doubles match report has already been handled.';
  end if;

  select *
  into v_team_one
  from public.doubles_teams
  where id = v_report.team_one_id
  for update;

  select *
  into v_team_two
  from public.doubles_teams
  where id = v_report.team_two_id
  for update;

  if v_team_one.id is null or v_team_two.id is null then
    raise exception 'Both doubles teams are required.';
  end if;

  if v_current_user not in (v_team_one.player_one_id, v_team_one.player_two_id, v_team_two.player_one_id, v_team_two.player_two_id) then
    raise exception 'Only involved team members can confirm this report.';
  end if;

  if v_report.responder_team_id = v_team_one.id and v_current_user not in (v_team_one.player_one_id, v_team_one.player_two_id) then
    raise exception 'Only a player from the opposing team can confirm this report.';
  end if;

  if v_report.responder_team_id = v_team_two.id and v_current_user not in (v_team_two.player_one_id, v_team_two.player_two_id) then
    raise exception 'Only a player from the opposing team can confirm this report.';
  end if;

  if v_team_one.player_one_id in (v_team_two.player_one_id, v_team_two.player_two_id)
    or v_team_one.player_two_id in (v_team_two.player_one_id, v_team_two.player_two_id) then
    raise exception 'Teams sharing a player cannot play a rated doubles match.';
  end if;

  if v_report.winner_team_id = v_team_one.id then
    v_winner := v_team_one;
    v_loser := v_team_two;
  elsif v_report.winner_team_id = v_team_two.id then
    v_winner := v_team_two;
    v_loser := v_team_one;
  else
    raise exception 'Winner must be one of the reported teams.';
  end if;

  v_team_expected := 1 / (1 + power(10, (v_loser.rating - v_winner.rating)::numeric / 400));
  v_team_delta := greatest(1, round(32 * (1 - v_team_expected))::integer);

  select avg(doubles_rating)::numeric
  into v_winner_avg
  from public.profiles
  where id in (v_winner.player_one_id, v_winner.player_two_id);

  select avg(doubles_rating)::numeric
  into v_loser_avg
  from public.profiles
  where id in (v_loser.player_one_id, v_loser.player_two_id);

  v_player_expected := 1 / (1 + power(10, (v_loser_avg - v_winner_avg) / 400));
  v_player_delta := greatest(1, round(32 * (1 - v_player_expected))::integer);

  update public.doubles_teams
  set rating = rating + v_team_delta,
      wins = wins + 1
  where id = v_winner.id;

  update public.doubles_teams
  set rating = greatest(0, rating - v_team_delta),
      losses = losses + 1
  where id = v_loser.id;

  update public.profiles
  set doubles_rating = doubles_rating + v_player_delta,
      doubles_wins = doubles_wins + 1
  where id in (v_winner.player_one_id, v_winner.player_two_id);

  update public.profiles
  set doubles_rating = greatest(0, doubles_rating - v_player_delta),
      doubles_losses = doubles_losses + 1
  where id in (v_loser.player_one_id, v_loser.player_two_id);

  insert into public.doubles_matches (
    team_one_id,
    team_two_id,
    winner_team_id,
    loser_team_id,
    team_one_score,
    team_two_score,
    score_summary,
    team_rating_delta,
    player_rating_delta,
    report_id,
    confirmed_by
  )
  values (
    v_report.team_one_id,
    v_report.team_two_id,
    v_report.winner_team_id,
    v_loser.id,
    greatest(0, coalesce(v_report.team_one_score, 0)),
    greatest(0, coalesce(v_report.team_two_score, 0)),
    nullif(trim(coalesce(v_report.score_summary, '')), ''),
    v_team_delta,
    v_player_delta,
    p_report_id,
    v_current_user
  )
  returning id into v_match_id;

  update public.doubles_match_reports
  set status = 'confirmed',
      confirmed_match_id = v_match_id,
      responded_by = v_current_user,
      responded_at = now()
  where id = p_report_id;

  return v_match_id;
end;
$$;
