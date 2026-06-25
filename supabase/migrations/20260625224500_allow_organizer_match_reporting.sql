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
  v_is_tournament_organizer boolean := false;
begin
  if v_current_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_tournament_id is not null then
    select exists (
      select 1
      from public.tournaments
      where id = p_tournament_id
        and organizer_id = v_current_user
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
