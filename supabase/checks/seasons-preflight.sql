-- Read-only. Run as the database owner before applying the seasons migration.
begin transaction read only;
select to_regclass('public.seasons') as existing_seasons_table;
select u.id,u.email,p.display_name from auth.users u join public.profiles p on p.id=u.id where lower(u.email)='zeleniak.nikita@gmail.com';
select 'players' as kind,count(*) as rows,sum(wins) as wins,sum(losses) as losses from public.profiles
union all select 'teams',count(*),sum(wins),sum(losses) from public.doubles_teams;
select 'singles' as kind,count(*) from public.matches
union all select 'doubles',count(*) from public.doubles_matches
union all select 'achievements',count(*) from public.profile_achievements
union all select 'pending singles',count(*) from public.match_reports where status='pending'
union all select 'pending doubles',count(*) from public.doubles_match_reports where status='pending';
select 'singles' as kind,to_jsonb(m) as recorded_today from public.matches m where created_at>='2026-09-08 00:00 America/Toronto' and created_at<'2026-09-09 00:00 America/Toronto'
union all select 'doubles',to_jsonb(m) from public.doubles_matches m where created_at>='2026-09-08 00:00 America/Toronto' and created_at<'2026-09-09 00:00 America/Toronto';
select id,display_name,rating,wins,losses from public.profiles order by rating desc,wins desc,losses asc,created_at,id;
select id,name,rating,wins,losses from public.doubles_teams order by rating desc,wins desc,losses asc,created_at,id;
select id,name,status from public.tournaments where status in ('draft','open','running');
commit;
