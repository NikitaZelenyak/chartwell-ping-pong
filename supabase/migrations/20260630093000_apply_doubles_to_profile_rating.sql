alter table public.doubles_matches
add column if not exists profile_rating_delta integer not null default 0;

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
  v_profile_delta integer;
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
  v_profile_delta := greatest(1, round(v_player_delta::numeric / 2)::integer);

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
      doubles_wins = doubles_wins + 1,
      rating = rating + v_profile_delta,
      wins = wins + 1
  where id in (v_winner.player_one_id, v_winner.player_two_id);

  update public.profiles
  set doubles_rating = greatest(0, doubles_rating - v_player_delta),
      doubles_losses = doubles_losses + 1,
      rating = greatest(0, rating - v_profile_delta),
      losses = losses + 1
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
    v_profile_delta,
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
