-- Atomic bootstrap: preserve the entire pre-season ledger, then reset once.
-- See docs/seasons-rollout.md BEFORE applying this migration to production.
begin;
select pg_advisory_xact_lock(20260908, 1);
lock table public.profiles, public.doubles_teams, public.matches,
  public.doubles_matches, public.match_reports, public.doubles_match_reports,
  public.tournaments in access exclusive mode;

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 80),
  starts_at timestamptz not null unique,
  ends_at timestamptz not null,
  timezone text not null default 'America/Toronto' check (timezone = 'America/Toronto'),
  status text not null check (status in ('active', 'closed')),
  closed_at timestamptz,
  closed_by uuid,
  previous_season_id uuid unique references public.seasons(id),
  champion_id uuid,
  champion_team_id uuid,
  check (ends_at > starts_at)
);
create unique index one_active_season on public.seasons ((status)) where status = 'active';
-- Deliberate allowlist. Creating a tournament does NOT grant league reset powers.
create table public.app_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade
);
do $$ begin
  if (select count(*) from auth.users u join public.profiles p on p.id=u.id where lower(u.email)='zeleniak.nikita@gmail.com') <> 1 then
    raise exception 'Expected exactly one organizer account: zeleniak.nikita@gmail.com. No season changes were applied.';
  end if;
end $$;
insert into public.app_admins(profile_id)
  select id from auth.users where lower(email)='zeleniak.nikita@gmail.com';
create table public.season_standings (
  season_id uuid not null references public.seasons(id),
  kind text not null check (kind in ('player', 'team')),
  entity_id uuid not null,
  rank integer not null,
  snapshot jsonb not null,
  primary key (season_id, kind, entity_id),
  unique (season_id, kind, rank)
);
create table public.season_history (
  season_id uuid not null references public.seasons(id),
  kind text not null check (kind in ('singles', 'doubles', 'singles_report', 'doubles_report')),
  record_id uuid not null,
  payload jsonb not null,
  primary key (season_id, kind, record_id)
);

alter table public.profiles
  add column lifetime_wins integer not null default 0,
  add column lifetime_losses integer not null default 0,
  add column lifetime_doubles_wins integer not null default 0,
  add column lifetime_doubles_losses integer not null default 0;
alter table public.doubles_teams
  add column lifetime_wins integer not null default 0,
  add column lifetime_losses integer not null default 0;
update public.profiles set lifetime_wins = wins, lifetime_losses = losses,
  lifetime_doubles_wins = doubles_wins, lifetime_doubles_losses = doubles_losses;
update public.doubles_teams set lifetime_wins = wins, lifetime_losses = losses;

insert into public.seasons (id, name, starts_at, ends_at, status)
values ('20260608-0000-4000-8000-000000000001', 'Summer 2026',
  least('2026-06-08 00:00 America/Toronto'::timestamptz,
    coalesce((select min(created_at) from public.matches), '2026-06-08 00:00 America/Toronto'::timestamptz),
    coalesce((select min(created_at) from public.doubles_matches), '2026-06-08 00:00 America/Toronto'::timestamptz)),
  '2026-09-08 00:00 America/Toronto', 'active');

alter table public.matches add column season_id uuid references public.seasons(id);
alter table public.doubles_matches add column season_id uuid references public.seasons(id);
alter table public.match_reports add column season_id uuid references public.seasons(id), add column boundary_note text;
alter table public.doubles_match_reports add column season_id uuid references public.seasons(id), add column boundary_note text;
alter table public.tournaments add column season_id uuid references public.seasons(id);
update public.matches set season_id = '20260608-0000-4000-8000-000000000001';
update public.doubles_matches set season_id = '20260608-0000-4000-8000-000000000001';
update public.match_reports set season_id = '20260608-0000-4000-8000-000000000001';
update public.doubles_match_reports set season_id = '20260608-0000-4000-8000-000000000001';
update public.tournaments set season_id = '20260608-0000-4000-8000-000000000001';
alter table public.matches alter column season_id set not null;
alter table public.doubles_matches alter column season_id set not null;
alter table public.match_reports alter column season_id set not null;
alter table public.doubles_match_reports alter column season_id set not null;
alter table public.tournaments alter column season_id set not null;
alter table public.match_reports drop constraint match_reports_status_check;
alter table public.match_reports add constraint match_reports_status_check check (status in ('pending','confirmed','declined','expired'));
alter table public.doubles_match_reports drop constraint doubles_match_reports_status_check;
alter table public.doubles_match_reports add constraint doubles_match_reports_status_check check (status in ('pending','confirmed','declined','expired'));

create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.app_admins where profile_id = auth.uid()) $$;

create function public.is_season_organizer() returns boolean language sql stable security definer set search_path=public as $$ select public.is_app_admin() $$;

-- All rating writers and report inserts take the same transaction lock BEFORE row locks.
create function public.require_active_season() returns uuid
language plpgsql security definer set search_path = public
as $$
declare s public.seasons%rowtype;
begin
  perform pg_advisory_xact_lock(20260908, 1);
  select * into s from public.seasons where status = 'active';
  if s.id is null or clock_timestamp() < s.starts_at or clock_timestamp() >= s.ends_at then
    raise exception 'The season is not open for rated results. Ask a season organizer to start the next season.';
  end if;
  return s.id;
end $$;

create function public.snapshot_season(p_season uuid) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.season_standings
    select p_season, 'player', p.id,
      row_number() over (order by rating desc, wins desc, losses asc, created_at, id), to_jsonb(p)
    from public.profiles p;
  insert into public.season_standings
    select p_season, 'team', t.id,
      row_number() over (order by t.rating desc, t.wins desc, t.losses asc, t.created_at, t.id),
      to_jsonb(t) || jsonb_build_object('player_one_name', coalesce(p.display_name,p.email,'Player'),
        'player_two_name', coalesce(q.display_name,q.email,'Player'))
    from public.doubles_teams t join public.profiles p on p.id=t.player_one_id
      join public.profiles q on q.id=t.player_two_id;
  update public.match_reports set status='expired',
    boundary_note='Season closed before confirmation; retained for history, no rating applied.'
    where season_id=p_season and status='pending';
  update public.doubles_match_reports set status='expired',
    boundary_note='Season closed before confirmation; retained for history, no rating applied.'
    where season_id=p_season and status='pending';
  insert into public.season_history select p_season,'singles',id,to_jsonb(m) from public.matches m where season_id=p_season;
  insert into public.season_history select p_season,'doubles',id,to_jsonb(m) from public.doubles_matches m where season_id=p_season;
  insert into public.season_history select p_season,'singles_report',id,to_jsonb(m) from public.match_reports m where season_id=p_season;
  insert into public.season_history select p_season,'doubles_report',id,to_jsonb(m) from public.doubles_match_reports m where season_id=p_season;
  update public.seasons set
    champion_id=(select entity_id from public.season_standings where season_id=p_season and kind='player' and (snapshot->>'wins')::int > 0 order by rank limit 1),
    champion_team_id=(select entity_id from public.season_standings where season_id=p_season and kind='team' and (snapshot->>'wins')::int > 0 order by rank limit 1),
    status='closed',closed_at=clock_timestamp(),closed_by=auth.uid()
    where id=p_season;
end $$;

select public.snapshot_season('20260608-0000-4000-8000-000000000001');
insert into public.seasons (id,name,starts_at,ends_at,status,previous_season_id)
values ('20260908-0000-4000-8000-000000000001','Autumn 2026',
  '2026-09-08 00:00 America/Toronto','2026-12-08 00:00 America/Toronto','active',
  '20260608-0000-4000-8000-000000000001');
update public.profiles set rating=1000,wins=0,losses=0,doubles_wins=0,doubles_losses=0;
update public.doubles_teams set rating=1000,wins=0,losses=0;

create function public.start_next_season(p_expected_season uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public
as $$
declare s public.seasons%rowtype; next_id uuid; next_end timestamptz;
begin
  if auth.uid() is null or not public.is_season_organizer() then
    raise exception 'Only a designated season organizer can close a season.';
  end if;
  perform pg_advisory_xact_lock(20260908,1);
  -- A retry (including a simultaneous click) returns the already-created successor.
  select id into next_id from public.seasons where previous_season_id=p_expected_season;
  if next_id is not null then return next_id; end if;
  select * into s from public.seasons where id=p_expected_season and status='active' for update;
  if s.id is null then raise exception 'Season changed. Refresh before continuing.'; end if;
  if clock_timestamp() < s.ends_at then raise exception 'This season cannot be closed before its scheduled end.'; end if;
  next_end := ((s.ends_at at time zone s.timezone) + interval '3 months') at time zone s.timezone;
  if clock_timestamp() >= next_end then raise exception 'The next season would already be over. A database administrator must review the missed season boundary.'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 80 then raise exception 'Enter a season name (1–80 characters).'; end if;
  perform public.snapshot_season(s.id);
  insert into public.seasons(name,starts_at,ends_at,status,previous_season_id)
    values(trim(p_name),s.ends_at,next_end,'active',s.id) returning id into next_id;
  update public.profiles set rating=1000,wins=0,losses=0,doubles_wins=0,doubles_losses=0;
  update public.doubles_teams set rating=1000,wins=0,losses=0;
  return next_id;
end $$;

create function public.assign_season() returns trigger
language plpgsql security definer set search_path = public
as $$
declare active_id uuid;
begin
  active_id := public.require_active_season();
  if new.season_id is not null and new.season_id <> active_id then
    raise exception 'This submission belongs to a different season. Refresh the page.';
  end if;
  new.season_id := active_id;
  new.created_at := clock_timestamp();
  return new;
end $$;
create trigger assign_match_season before insert on public.matches for each row execute function public.assign_season();
create trigger assign_doubles_match_season before insert on public.doubles_matches for each row execute function public.assign_season();
create trigger assign_report_season before insert on public.match_reports for each row execute function public.assign_season();
create trigger assign_doubles_report_season before insert on public.doubles_match_reports for each row execute function public.assign_season();
create trigger assign_tournament_season before insert on public.tournaments for each row execute function public.assign_season();

-- Direct API clients may decline a report, never change its players, scores or season.
revoke update on public.match_reports, public.doubles_match_reports from authenticated, anon;
grant update(status) on public.match_reports, public.doubles_match_reports to authenticated;
create function public.guard_report_update() returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user in ('authenticated','anon') and
    (old.status <> 'pending' or new.status <> 'declined') then
    raise exception 'Use the confirmation action to apply a result.';
  end if;
  if current_user in ('authenticated','anon') then
    new.responded_by:=auth.uid(); new.responded_at:=clock_timestamp();
  end if;
  return new;
end $$;
create trigger guard_report_update before update on public.match_reports for each row execute function public.guard_report_update();
create trigger guard_doubles_report_update before update on public.doubles_match_reports for each row execute function public.guard_report_update();

create function public.track_lifetime_results() returns trigger
language plpgsql set search_path = public
as $$
begin
  new.lifetime_wins := old.lifetime_wins + greatest(0,new.wins-old.wins);
  new.lifetime_losses := old.lifetime_losses + greatest(0,new.losses-old.losses);
  if tg_table_name='profiles' then
    new.lifetime_doubles_wins := old.lifetime_doubles_wins + greatest(0,new.doubles_wins-old.doubles_wins);
    new.lifetime_doubles_losses := old.lifetime_doubles_losses + greatest(0,new.doubles_losses-old.doubles_losses);
  end if;
  return new;
end $$;
create trigger track_lifetime_results before update on public.profiles for each row execute function public.track_lifetime_results();
create trigger track_team_lifetime_results before update on public.doubles_teams for each row execute function public.track_lifetime_results();
-- Prevent clients from bypassing the rating functions or granting themselves reset rights.
revoke update, insert on public.profiles from authenticated, anon;
grant update(display_name,preferred_hand,bio,avatar_style,avatar_seed,card_style,updated_at) on public.profiles to authenticated;
revoke update, insert on public.doubles_teams from authenticated, anon;
grant update(name) on public.doubles_teams to authenticated;
-- Team creation is still supported; the guard enforces zero initial statistics.
grant insert on public.doubles_teams to authenticated;
create function public.guard_new_team() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(20260908,1);
  new.rating:=1000; new.wins:=0; new.losses:=0; new.lifetime_wins:=0; new.lifetime_losses:=0;
  return new;
end $$;
create trigger guard_new_team before insert on public.doubles_teams for each row execute function public.guard_new_team();
-- New users cannot appear halfway through a snapshot/reset transaction.
create function public.lock_new_profile() returns trigger language plpgsql as $$
begin perform pg_advisory_xact_lock(20260908,1); return new; end $$;
create trigger lock_new_profile before insert on public.profiles for each row execute function public.lock_new_profile();
create or replace function public.apply_singles_match_internal(
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
  v_is_tournament_organizer boolean := false;
begin
  perform public.require_active_season();
  if v_current_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_tournament_id is not null then
    select exists (
      select 1
      from public.tournaments
      where id = p_tournament_id
        and (organizer_id = v_current_user or public.is_app_admin())
    )
    into v_is_tournament_organizer;
  end if;

  if v_current_user <> p_player_one and not v_is_tournament_organizer then
    raise exception 'Only the reporting player or tournament organizer can submit this result';
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
create or replace function public.confirm_match_report(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.match_reports%rowtype;
  v_match_id uuid;
  v_current_user uuid := auth.uid();
  v_other_player uuid;
  v_current_user_score integer;
  v_other_player_score integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform public.require_active_season();
  select *
  into v_report
  from public.match_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Match report not found.';
  end if;

  if v_report.season_id <> (select id from public.seasons where status='active') then
    raise exception 'This report belongs to a closed season and cannot affect current ratings.';
  end if;

  if v_report.status <> 'pending' then
    raise exception 'Match report has already been handled.';
  end if;

  if v_report.opponent_id <> v_current_user then
    raise exception 'Only the opponent can confirm this match report.';
  end if;

  v_other_player := v_report.reporter_id;

  v_current_user_score := case
    when v_report.player_one_id = v_current_user then v_report.player_one_score
    else v_report.player_two_score
  end;

  v_other_player_score := case
    when v_report.player_one_id = v_other_player then v_report.player_one_score
    else v_report.player_two_score
  end;

  v_match_id := public.apply_singles_match_internal(
    v_current_user,
    v_other_player,
    v_report.winner_id,
    v_current_user_score,
    v_other_player_score,
    v_report.score_summary,
    null,
    v_report.invite_id
  );

  update public.match_reports
  set
    status = 'confirmed',
    confirmed_match_id = v_match_id,
    responded_by = v_current_user,
    responded_at = now()
  where id = p_report_id;

  return v_match_id;
end;
$$;

create or replace function public.report_match(
  p_player_one uuid, p_player_two uuid, p_winner uuid,
  p_player_one_score integer, p_player_two_score integer,
  p_score_summary text default null, p_tournament_id uuid default null, p_invite_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare active_id uuid;
begin
  active_id:=public.require_active_season();
  if auth.uid() is null or not exists(select 1 from public.tournaments
    where id=p_tournament_id and (organizer_id=auth.uid() or public.is_app_admin()) and season_id=active_id) then
    raise exception 'Use opponent confirmation for casual games. Tournament results require the current season and its organizer.';
  end if;
  return public.apply_singles_match_internal(p_player_one,p_player_two,p_winner,
    p_player_one_score,p_player_two_score,p_score_summary,p_tournament_id,p_invite_id);
end $$;
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
  perform public.require_active_season();
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

  if v_report.season_id <> (select id from public.seasons where status='active') then
    raise exception 'This doubles report belongs to a closed season and cannot affect current ratings.';
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

  if v_current_user not in (
    v_team_one.player_one_id,
    v_team_one.player_two_id,
    v_team_two.player_one_id,
    v_team_two.player_two_id
  ) then
    raise exception 'Only involved team members can confirm this report.';
  end if;

  if v_report.responder_team_id = v_team_one.id
    and v_current_user not in (v_team_one.player_one_id, v_team_one.player_two_id) then
    raise exception 'Only a player from the opposing team can confirm this report.';
  end if;

  if v_report.responder_team_id = v_team_two.id
    and v_current_user not in (v_team_two.player_one_id, v_team_two.player_two_id) then
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

  select avg(rating)::numeric
  into v_winner_avg
  from public.profiles
  where id in (v_winner.player_one_id, v_winner.player_two_id);

  select avg(rating)::numeric
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
  set rating = rating + v_player_delta,
      wins = wins + 1,
      doubles_wins = doubles_wins + 1
  where id in (v_winner.player_one_id, v_winner.player_two_id);

  update public.profiles
  set rating = greatest(0, rating - v_player_delta),
      losses = losses + 1,
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
    profile_rating_delta,
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


-- Freeze season tags on existing tournaments (including through direct API calls).
create function public.guard_tournament_season() returns trigger language plpgsql as $$
begin
  if new.season_id is distinct from old.season_id then raise exception 'A tournament cannot move between seasons.'; end if;
  return new;
end $$;
create trigger guard_tournament_season before update on public.tournaments for each row execute function public.guard_tournament_season();

alter table public.seasons enable row level security;
alter table public.app_admins enable row level security;
alter table public.season_standings enable row level security;
alter table public.season_history enable row level security;
create policy seasons_read on public.seasons for select to authenticated using(true);
create policy organizers_read_self on public.app_admins for select to authenticated using(profile_id=auth.uid());
create policy standings_read on public.season_standings for select to authenticated using(true);
create policy history_read on public.season_history for select to authenticated using(
  kind in ('singles','doubles')
  or public.is_season_organizer()
  or (kind='singles_report' and auth.uid()::text in (payload->>'reporter_id',payload->>'opponent_id'))
  or (kind='doubles_report' and exists(select 1 from public.season_standings s
    where s.season_id=season_history.season_id and s.kind='team'
    and s.entity_id::text in (payload->>'team_one_id',payload->>'team_two_id')
    and auth.uid()::text in (s.snapshot->>'player_one_id',s.snapshot->>'player_two_id')))
);
grant select on public.seasons,public.app_admins,public.season_standings,public.season_history to authenticated;
revoke insert,update,delete on public.seasons,public.app_admins,public.season_standings,public.season_history from authenticated,anon;
revoke all on function public.snapshot_season(uuid),public.require_active_season(),
  public.apply_singles_match_internal(uuid,uuid,uuid,integer,integer,text,uuid,uuid),
  public.assign_season(),public.guard_report_update(),public.track_lifetime_results(),
  public.guard_new_team(),public.lock_new_profile(),public.guard_tournament_season()
  from public,anon,authenticated;
revoke all on function public.start_next_season(uuid,text),public.is_season_organizer(),public.is_app_admin(),
  public.confirm_match_report(uuid),public.confirm_doubles_match_report(uuid),
  public.report_match(uuid,uuid,uuid,integer,integer,text,uuid,uuid) from public,anon;
grant execute on function public.start_next_season(uuid,text),public.is_season_organizer(),public.is_app_admin(),
  public.confirm_match_report(uuid),public.confirm_doubles_match_report(uuid),
  public.report_match(uuid,uuid,uuid,integer,integer,text,uuid,uuid) to authenticated;
create index matches_season_idx on public.matches(season_id,created_at desc);
create index doubles_matches_season_idx on public.doubles_matches(season_id,created_at desc);
create index reports_season_idx on public.match_reports(season_id,status);
create index doubles_reports_season_idx on public.doubles_match_reports(season_id,status);
create function public.season_leaderboard(p_season uuid, p_kind text)
returns table(entity_id uuid, rank bigint, snapshot jsonb)
language sql stable set search_path=public as $$
  select s.entity_id,s.rank::bigint,s.snapshot from public.season_standings s
    where s.season_id=p_season and s.kind=p_kind
  union all
  select p.id,row_number() over(order by rating desc,wins desc,losses asc,created_at,id),to_jsonb(p)
    from public.profiles p where p_kind='player' and exists(select 1 from public.seasons where id=p_season and status='active')
  union all
  select t.id,row_number() over(order by t.rating desc,t.wins desc,t.losses asc,t.created_at,t.id),
    to_jsonb(t)||jsonb_build_object('player_one_name',coalesce(p.display_name,p.email,'Player'),'player_two_name',coalesce(q.display_name,q.email,'Player'))
    from public.doubles_teams t join public.profiles p on p.id=t.player_one_id join public.profiles q on q.id=t.player_two_id
    where p_kind='team' and exists(select 1 from public.seasons where id=p_season and status='active')
$$;
revoke all on function public.season_leaderboard(uuid,text) from public,anon;
grant execute on function public.season_leaderboard(uuid,text) to authenticated;
create policy organizer_reports_read on public.match_reports for select to authenticated using(public.is_season_organizer());
create policy organizer_doubles_reports_read on public.doubles_match_reports for select to authenticated using(public.is_season_organizer());
create policy admin_tournaments_update on public.tournaments for update to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
create policy admin_tournaments_delete on public.tournaments for delete to authenticated using(public.is_app_admin());
create policy admin_games_manage on public.tournament_games for all to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
create policy admin_entries_manage on public.tournament_entries for all to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
create policy admin_profiles_update on public.profiles for update to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
create policy admin_teams_update on public.doubles_teams for update to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
create policy admin_posts_delete on public.posts for delete to authenticated using(public.is_app_admin());
create policy admin_comments_delete on public.post_comments for delete to authenticated using(public.is_app_admin());
create function public.rename_active_season(p_season uuid,p_name text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_app_admin() then raise exception 'Administrator access required.'; end if;
  perform pg_advisory_xact_lock(20260908,1);
  if p_name is null or length(trim(p_name)) not between 1 and 80 then raise exception 'Enter a season name (1–80 characters).'; end if;
  update public.seasons set name=trim(p_name) where id=p_season and status='active';
  if not found then raise exception 'Only the active season can be renamed. Refresh the page.'; end if;
end $$;
revoke all on function public.rename_active_season(uuid,text) from public,anon;
grant execute on function public.rename_active_season(uuid,text) to authenticated;
commit;
