\set ON_ERROR_STOP on
-- Run after run-seasons.sql, only on the disposable local server.
create extension if not exists dblink;
select dblink_connect('season_a',format('host=127.0.0.1 port=%s dbname=%s',current_setting('port'),current_database()));
select dblink_connect('season_b',format('host=127.0.0.1 port=%s dbname=%s',current_setting('port'),current_database()));
select dblink_exec('season_a','set role authenticated');
select dblink_exec('season_b','set role authenticated');
select dblink_exec('season_a',$q$set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'$q$);
select dblink_exec('season_b',$q$set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'$q$);
update public.seasons set ends_at=clock_timestamp()+interval '1 hour' where status='active';
insert into public.match_reports(id,reporter_id,opponent_id,player_one_id,player_two_id,winner_id,score_summary)
values('40000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Concurrent confirmation');
select dblink_send_query('season_a',$q$select public.confirm_match_report('40000000-0000-4000-8000-000000000003')$q$);
select dblink_send_query('season_b',$q$select public.confirm_match_report('40000000-0000-4000-8000-000000000003')$q$);
create temp table confirmation_results as select * from dblink_get_result('season_a',false) as t(id uuid);
insert into confirmation_results select * from dblink_get_result('season_b',false) as t(id uuid);
select fixture.assert((select count(*)=1 from confirmation_results),'simultaneous confirmations apply exactly once');
select fixture.assert((select count(*)=1 from public.matches where score_summary='Concurrent confirmation'),'no duplicate match row');
select fixture.assert((select wins=1 and rating=1016 from public.profiles where id='00000000-0000-4000-8000-000000000001'),'no duplicate Elo');
select * from dblink_get_result('season_a',false) as t(id uuid);
select * from dblink_get_result('season_b',false) as t(id uuid);
-- A pending report races the rollover lock at the exact boundary.
insert into public.match_reports(id,reporter_id,opponent_id,player_one_id,player_two_id,winner_id,score_summary)
values('40000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Boundary race');
select id as closing_id from public.seasons where status='active' \gset
update public.seasons set ends_at=clock_timestamp()+interval '500 milliseconds' where status='active';
select dblink_exec('season_b',$q$set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'$q$);
begin;
select pg_advisory_xact_lock(20260908,1);
select dblink_send_query('season_a',$q$select public.confirm_match_report('40000000-0000-4000-8000-000000000004')$q$);
select dblink_send_query('season_b',format('select public.start_next_season(%L,%L)',:'closing_id','Concurrent successor'));
select pg_sleep(0.7);
commit;
select * from dblink_get_result('season_a',false) as t(id uuid);
select * from dblink_get_result('season_b') as t(id uuid);
select fixture.assert((select status='expired' from public.match_reports where id='40000000-0000-4000-8000-000000000004'),'boundary report expires');
select fixture.assert(not exists(select 1 from public.matches where score_summary='Boundary race'),'late report never applies');
select fixture.assert(not exists(select 1 from public.profiles where rating<>1000 or wins<>0 or losses<>0),'boundary race leaves new ratings fresh');
select * from dblink_get_result('season_a',false) as t(id uuid);
select * from dblink_get_result('season_b',false) as t(id uuid);
-- Two organizer clicks race to create a successor.
select dblink_exec('season_a',$q$set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'$q$);
select id as closing_id from public.seasons where status='active' \gset
update public.seasons set starts_at=clock_timestamp()-interval '1 minute',ends_at=clock_timestamp()-interval '1 second' where status='active';
select dblink_send_query('season_a',format('select public.start_next_season(%L,%L)',:'closing_id','One successor only'));
select dblink_send_query('season_b',format('select public.start_next_season(%L,%L)',:'closing_id','One successor only'));
create temp table rollover_results as select * from dblink_get_result('season_a') as t(id uuid);
insert into rollover_results select * from dblink_get_result('season_b') as t(id uuid);
select fixture.assert((select count(*)=2 and count(distinct id)=1 from rollover_results),'simultaneous resets return the same successor');
select fixture.assert((select count(*)=1 from public.seasons where previous_season_id=:'closing_id'),'one successor per season');
select dblink_disconnect('season_a');
select dblink_disconnect('season_b');
select 'All simultaneous confirmation, boundary race, and rollover tests passed.' as result;
