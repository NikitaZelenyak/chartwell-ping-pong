-- Read-only database-owner check of authenticated-role permissions.
begin transaction read only;
select set_config('request.jwt.claim.sub',(select profile_id::text from public.app_admins limit 1),true);
set local role authenticated;
select public.is_app_admin() as designated_account_is_admin,public.is_season_organizer() as can_manage_seasons;
select count(*) as current_player_standings from public.season_leaderboard('20260908-0000-4000-8000-000000000001','player');
select count(*) as archived_team_standings from public.season_leaderboard('20260608-0000-4000-8000-000000000001','team');
select has_function_privilege('authenticated','public.apply_singles_match_internal(uuid,uuid,uuid,integer,integer,text,uuid,uuid)','execute') as can_bypass_confirmation,
 has_column_privilege('authenticated','public.profiles','rating','update') as can_edit_ratings,
 has_table_privilege('authenticated','public.app_admins','insert') as can_grant_admin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where id<>auth.uid() order by id limit 1),true);
select public.is_app_admin() as other_player_is_admin;
select count(*) as visible_admin_rows_to_other_player from public.app_admins;
commit;
