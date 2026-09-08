create function fixture.assert(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
select fixture.assert((select count(*)=2 from public.seasons),'two seasons');
select fixture.assert((select starts_at='2026-09-08 04:00Z' and ends_at='2026-12-08 05:00Z' from public.seasons where name='Autumn 2026'),'Toronto calendar months and DST');
select fixture.assert(not exists(select 1 from public.profiles where rating<>1000 or wins<>0 or losses<>0 or doubles_wins<>0 or doubles_losses<>0),'all seasonal player counters reset');
select fixture.assert(not exists(select 1 from public.doubles_teams where rating<>1000 or wins<>0 or losses<>0),'all team counters reset');
select fixture.assert(not exists(select 1 from fixture.profiles f join public.profiles p using(id) where p.lifetime_wins<>f.wins or p.lifetime_losses<>f.losses or p.lifetime_doubles_wins<>f.doubles_wins),'lifetime preserved');
select fixture.assert(not exists(select 1 from fixture.profiles f left join public.season_standings s on s.entity_id=f.id and s.kind='player' where (s.snapshot->>'rating')::int<>f.rating or (s.snapshot->>'wins')::int<>f.wins or (s.snapshot->>'losses')::int<>f.losses or s.entity_id is null),'player archive exact');
select fixture.assert(not exists(select 1 from fixture.teams f left join public.season_standings s on s.entity_id=f.id and s.kind='team' where (s.snapshot->>'rating')::int<>f.rating or (s.snapshot->>'wins')::int<>f.wins or s.entity_id is null),'team archive exact');
select fixture.assert(not exists(select 1 from fixture.matches f left join public.season_history h on h.record_id=f.id and h.kind='singles' where h.payload-'season_id' <> to_jsonb(f) or h.record_id is null),'all singles bytes preserved, including today');
select fixture.assert(not exists(select 1 from fixture.doubles_matches f left join public.season_history h on h.record_id=f.id and h.kind='doubles' where h.payload-'season_id' <> to_jsonb(f) or h.record_id is null),'all doubles bytes preserved, including today');
select fixture.assert((select count(*)=1 from public.profile_achievements a join fixture.achievements f on to_jsonb(a)=to_jsonb(f)),'achievements unchanged');
select fixture.assert((select champion_id='00000000-0000-4000-8000-000000000001' and champion_team_id='10000000-0000-4000-8000-000000000001' from public.seasons where name='Summer 2026'),'champions preserved');
select fixture.assert((select count(*)=2 from public.season_history where payload->>'status'='expired'),'pending reports preserved and expired');
-- The production dates above are fixed; use a clock-relative open window for repeatable tests in future years.
update public.seasons set starts_at=clock_timestamp()-interval '1 hour',ends_at=clock_timestamp()+interval '1 hour' where status='active';
-- Execute the same functions as an authenticated API user, including RLS/grants.
grant usage on schema fixture to authenticated;
grant execute on function fixture.assert(boolean,text) to authenticated;
create function fixture.expect_error(statement text, expected text) returns void language plpgsql as $$
declare actual text;
begin
  begin execute statement; exception when others then actual:=sqlerrm; end;
  if actual is null or position(expected in actual)=0 then raise exception 'Expected error %, got % for %',expected,actual,statement; end if;
end $$;
grant execute on function fixture.expect_error(text,text) to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select fixture.assert(not public.is_app_admin(),'other users not admin');
select fixture.expect_error($q$select public.start_next_season('20260908-0000-4000-8000-000000000001','Winter 2026')$q$,'Only a designated');
select fixture.expect_error($q$insert into public.app_admins values('00000000-0000-4000-8000-000000000002')$q$,'permission denied');
select fixture.expect_error($q$update public.profiles set rating=9999 where id=auth.uid()$q$,'permission denied');
select fixture.expect_error($q$update public.profiles set lifetime_wins=9999 where id=auth.uid()$q$,'permission denied');
select fixture.expect_error($q$select public.snapshot_season('20260908-0000-4000-8000-000000000001')$q$,'permission denied');
select fixture.expect_error($q$select public.confirm_match_report('40000000-0000-4000-8000-000000000001')$q$,'closed season');
select fixture.expect_error($q$select public.confirm_doubles_match_report('50000000-0000-4000-8000-000000000001')$q$,'closed season');
select fixture.expect_error($q$select public.rename_active_season('20260908-0000-4000-8000-000000000001','Hacked')$q$,'Administrator access');
select fixture.expect_error($q$update public.season_standings set snapshot='{}'$q$,'permission denied');
select fixture.assert((select count(*)=4 from public.season_leaderboard('20260908-0000-4000-8000-000000000001','player')),'live standings available');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select fixture.assert((select count(*)=0 from public.season_history where kind='doubles_report'),'report archive respects participant visibility');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
update public.profiles set display_name='Updated player name' where id=auth.uid();
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select fixture.assert(public.is_app_admin(),'designated account is admin');
select fixture.expect_error($q$select public.start_next_season('20260908-0000-4000-8000-000000000001','Winter 2026')$q$,'scheduled end');
select fixture.expect_error($q$insert into public.match_reports(reporter_id,opponent_id,player_one_id,player_two_id,winner_id,season_id) values(auth.uid(),'00000000-0000-4000-8000-000000000002',auth.uid(),'00000000-0000-4000-8000-000000000002',auth.uid(),'20260608-0000-4000-8000-000000000001')$q$,'different season');
insert into public.match_reports(id,reporter_id,opponent_id,player_one_id,player_two_id,winner_id,score_summary,season_id)
values('40000000-0000-4000-8000-000000000002',auth.uid(),'00000000-0000-4000-8000-000000000002',auth.uid(),'00000000-0000-4000-8000-000000000002',auth.uid(),'11-9','20260908-0000-4000-8000-000000000001');
select fixture.expect_error($q$select public.confirm_match_report('40000000-0000-4000-8000-000000000002')$q$,'Only the opponent');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select fixture.expect_error($q$update public.match_reports set status='confirmed' where id='40000000-0000-4000-8000-000000000002'$q$,'Use the confirmation');
select fixture.expect_error($q$update public.match_reports set season_id='20260608-0000-4000-8000-000000000001' where id='40000000-0000-4000-8000-000000000002'$q$,'permission denied');
select public.confirm_match_report('40000000-0000-4000-8000-000000000002');
select fixture.expect_error($q$select public.confirm_match_report('40000000-0000-4000-8000-000000000002')$q$,'already been handled');
select fixture.assert((select rating=1016 and wins=1 and lifetime_wins=10 from public.profiles where id='00000000-0000-4000-8000-000000000001'),'new singles Elo and cumulative wins');
select fixture.assert((select season_id='20260908-0000-4000-8000-000000000001' from public.matches where score_summary='11-9'),'confirmed match tagged Autumn');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
insert into public.doubles_match_reports(id,reporter_id,team_one_id,team_two_id,winner_team_id,responder_team_id,score_summary)
values('50000000-0000-4000-8000-000000000002',auth.uid(),'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','11-8');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.confirm_doubles_match_report('50000000-0000-4000-8000-000000000002');
select fixture.expect_error($q$select public.confirm_doubles_match_report('50000000-0000-4000-8000-000000000002')$q$,'already been handled');
select fixture.assert((select rating=1016 and wins=1 and lifetime_wins=7 from public.doubles_teams where id='10000000-0000-4000-8000-000000000001'),'new doubles team Elo and lifetime');
select fixture.assert((select rating=1032 and wins=2 and doubles_wins=1 and lifetime_wins=11 and lifetime_doubles_wins=2 from public.profiles where id='00000000-0000-4000-8000-000000000001'),'doubles updates player rating and both lifetime counters');
reset role;
-- Freeze before rollover to prove the second archive is also exact.
create table fixture.autumn_profiles as select * from public.profiles;
create table fixture.autumn_teams as select * from public.doubles_teams;
update public.seasons set ends_at=clock_timestamp()-interval '1 second' where name='Autumn 2026';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.start_next_season('20260908-0000-4000-8000-000000000001','Winter 2026') as next_id \gset
select fixture.assert(public.start_next_season('20260908-0000-4000-8000-000000000001','Different retry name')=:'next_id'::uuid,'idempotent retry returns same successor');
select fixture.assert((select count(*)=3 from public.seasons),'retry did not create duplicate season');
select fixture.assert(not exists(select 1 from public.profiles where rating<>1000 or wins<>0 or losses<>0),'second reset complete');
reset role;
select fixture.assert(not exists(select 1 from fixture.autumn_profiles f join public.profiles p using(id) where p.lifetime_wins<>f.lifetime_wins or p.lifetime_losses<>f.lifetime_losses),'second reset preserves lifetime');
select fixture.assert(not exists(select 1 from fixture.autumn_profiles f left join public.season_standings s on s.entity_id=f.id and s.season_id='20260908-0000-4000-8000-000000000001' and s.kind='player' where s.snapshot<>to_jsonb(f) or s.entity_id is null),'second snapshot exact');
select fixture.assert((select count(*)=2 from public.season_history where season_id='20260908-0000-4000-8000-000000000001' and kind in ('singles','doubles')),'second season history complete');
select fixture.assert((select snapshot->>'display_name'='player2' from public.season_standings where season_id='20260608-0000-4000-8000-000000000001' and entity_id='00000000-0000-4000-8000-000000000002'),'renaming a player cannot rewrite Summer identity');
-- Rollback on a duplicate successor name must leave the entire current season intact.
update public.seasons set ends_at=clock_timestamp()-interval '1 second',starts_at=clock_timestamp()-interval '1 minute' where status='active';
set role authenticated;
select fixture.expect_error(format('select public.start_next_season(%L,%L)',:'next_id','Summer 2026'),'duplicate key');
select fixture.assert((select status='active' from public.seasons where id=:'next_id'),'failed rollover leaves active season untouched');
reset role;
select 'All season preservation, authorization, confirmation, and rollover assertions passed.' as result;
