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
  select *
  into v_report
  from public.match_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Match report not found.';
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

  v_match_id := public.report_match(
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
