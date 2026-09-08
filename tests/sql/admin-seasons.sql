\set ON_ERROR_STOP on
-- Additional regression cases, run after the main fixture suite.
update public.seasons set starts_at=clock_timestamp()-interval '1 minute',ends_at=clock_timestamp()+interval '1 hour' where status='active';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
insert into public.tournaments(id,organizer_id,name) values('60000000-0000-4000-8000-000000000001',auth.uid(),'Other organizer tournament');
select fixture.assert(not public.is_app_admin(),'creating tournaments does not grant admin');
select fixture.expect_error($q$select public.start_next_season((select id from public.seasons where status='active'),'Cannot reset')$q$,'Only a designated');
select fixture.expect_error($q$select public.report_match('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',11,5)$q$,'Use opponent confirmation');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
update public.tournaments set name='Admin managed tournament' where id='60000000-0000-4000-8000-000000000001';
select fixture.assert((select name='Admin managed tournament' from public.tournaments where id='60000000-0000-4000-8000-000000000001'),'admin manages other organizer tournament');
select public.report_match('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',11,5,'Admin tournament result','60000000-0000-4000-8000-000000000001');
select fixture.assert((select count(*)=1 from public.matches where score_summary='Admin tournament result'),'admin reports other organizer rated game');
select fixture.expect_error($q$update public.tournaments set season_id='20260608-0000-4000-8000-000000000001' where id='60000000-0000-4000-8000-000000000001'$q$,'cannot move between seasons');
select public.rename_active_season((select id from public.seasons where status='active'),'Renamed by owner');
select fixture.assert((select count(*)=1 from public.seasons where name='Renamed by owner'),'admin season setting saved');
-- Creating a new team cannot smuggle pre-set ratings or cumulative wins.
insert into public.doubles_teams(id,name,created_by,player_one_id,player_two_id,rating,wins,lifetime_wins)
values('10000000-0000-4000-8000-000000000003','New partnership',auth.uid(),auth.uid(),'00000000-0000-4000-8000-000000000003',9999,500,500);
select fixture.assert((select rating=1000 and wins=0 and lifetime_wins=0 from public.doubles_teams where id='10000000-0000-4000-8000-000000000003'),'new team initializes cleanly');
reset role;
-- Archived history survives existing cascade deletes on the original tables.
begin;
delete from public.matches where id='20000000-0000-4000-8000-000000000001';
select fixture.assert((select count(*)=1 from public.season_history where record_id='20000000-0000-4000-8000-000000000001' and kind='singles'),'history snapshot survives original deletion');
rollback;
select 'All admin and archive-retention regression tests passed.' as result;
