-- Read-only. Run immediately after migration, before new matches are confirmed.
begin transaction read only;
select id,name,starts_at,ends_at,status,closed_at,champion_id,champion_team_id from public.seasons order by starts_at;
select u.email,a.profile_id from public.app_admins a join auth.users u on u.id=a.profile_id;
select kind,count(*) as archived_rows from public.season_standings where season_id='20260608-0000-4000-8000-000000000001' group by kind;
select kind,count(*) as archived_rows from public.season_history where season_id='20260608-0000-4000-8000-000000000001' group by kind;
select count(*) as unexpected_player_reset_values from public.profiles where rating<>1000 or wins<>0 or losses<>0 or doubles_wins<>0 or doubles_losses<>0;
select count(*) as unexpected_team_reset_values from public.doubles_teams where rating<>1000 or wins<>0 or losses<>0;
select count(*) as unexpected_player_lifetime_values from public.profiles p join public.season_standings s on s.entity_id=p.id and s.kind='player' and s.season_id='20260608-0000-4000-8000-000000000001'
 where p.lifetime_wins<>(s.snapshot->>'wins')::int or p.lifetime_losses<>(s.snapshot->>'losses')::int or p.lifetime_doubles_wins<>(s.snapshot->>'doubles_wins')::int or p.lifetime_doubles_losses<>(s.snapshot->>'doubles_losses')::int;
select count(*) as unexpected_team_lifetime_values from public.doubles_teams t join public.season_standings s on s.entity_id=t.id and s.kind='team' and s.season_id='20260608-0000-4000-8000-000000000001'
 where t.lifetime_wins<>(s.snapshot->>'wins')::int or t.lifetime_losses<>(s.snapshot->>'losses')::int;
select count(*) as changed_singles_history from public.matches m left join public.season_history h on h.record_id=m.id and h.kind='singles' where m.season_id='20260608-0000-4000-8000-000000000001' and (h.payload is null or h.payload<>to_jsonb(m));
select count(*) as changed_doubles_history from public.doubles_matches m left join public.season_history h on h.record_id=m.id and h.kind='doubles' where m.season_id='20260608-0000-4000-8000-000000000001' and (h.payload is null or h.payload<>to_jsonb(m));
select count(*) as old_pending_reports from public.match_reports where season_id='20260608-0000-4000-8000-000000000001' and status='pending';
select count(*) as old_pending_doubles_reports from public.doubles_match_reports where season_id='20260608-0000-4000-8000-000000000001' and status='pending';
select count(*) as achievements from public.profile_achievements;
commit;
