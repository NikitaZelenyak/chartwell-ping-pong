create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  invite_id uuid references public.match_invites(id) on delete set null,
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  winner_id uuid not null references public.profiles(id) on delete cascade,
  player_one_score integer not null default 0,
  player_two_score integer not null default 0,
  score_summary text,
  status text not null default 'pending',
  confirmed_match_id uuid references public.matches(id) on delete set null,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_reports_status_check check (status in ('pending', 'confirmed', 'declined')),
  constraint match_reports_distinct_players check (player_one_id <> player_two_id),
  constraint match_reports_reporter_check check (reporter_id in (player_one_id, player_two_id)),
  constraint match_reports_opponent_check check (opponent_id in (player_one_id, player_two_id) and opponent_id <> reporter_id),
  constraint match_reports_winner_check check (winner_id in (player_one_id, player_two_id)),
  constraint match_reports_scores_check check (player_one_score >= 0 and player_two_score >= 0)
);

drop trigger if exists match_reports_set_updated_at on public.match_reports;
create trigger match_reports_set_updated_at
before update on public.match_reports
for each row execute function public.set_updated_at();

alter table public.match_reports enable row level security;

drop policy if exists "Match reports are visible to participants" on public.match_reports;
create policy "Match reports are visible to participants"
on public.match_reports for select
to authenticated
using (auth.uid() in (reporter_id, opponent_id));

drop policy if exists "Users can create their own match reports" on public.match_reports;
create policy "Users can create their own match reports"
on public.match_reports for insert
to authenticated
with check (
  auth.uid() = reporter_id
  and status = 'pending'
  and auth.uid() in (player_one_id, player_two_id)
  and opponent_id in (player_one_id, player_two_id)
  and opponent_id <> auth.uid()
);

drop policy if exists "Opponents can respond to pending match reports" on public.match_reports;
create policy "Opponents can respond to pending match reports"
on public.match_reports for update
to authenticated
using (auth.uid() = opponent_id and status = 'pending')
with check (
  auth.uid() = opponent_id
  and status in ('confirmed', 'declined')
);

create index if not exists match_reports_reporter_idx
on public.match_reports (reporter_id, status, created_at desc);

create index if not exists match_reports_opponent_idx
on public.match_reports (opponent_id, status, created_at desc);

create or replace function public.confirm_match_report(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.match_reports%rowtype;
  v_match_id uuid;
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

  if v_report.opponent_id <> auth.uid() then
    raise exception 'Only the opponent can confirm this match report.';
  end if;

  v_match_id := public.report_match(
    v_report.player_one_id,
    v_report.player_two_id,
    v_report.winner_id,
    v_report.player_one_score,
    v_report.player_two_score,
    v_report.score_summary,
    null,
    v_report.invite_id
  );

  update public.match_reports
  set
    status = 'confirmed',
    confirmed_match_id = v_match_id,
    responded_by = auth.uid(),
    responded_at = now()
  where id = p_report_id;

  return v_match_id;
end;
$$;
