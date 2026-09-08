-- Community schema is mocked only for admin-policy creation; seasons tests use the real match schema.
create table public.posts(id uuid primary key, author_id uuid,body text);
create table public.post_comments(id uuid primary key, author_id uuid,body text);
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
insert into auth.users(id,email) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'player'||i||'@example.test' from generate_series(1,4) i;
update auth.users set email='zeleniak.nikita@gmail.com' where id='00000000-0000-4000-8000-000000000001';
update public.profiles set rating=case right(id::text,1) when '1' then 1234 when '2' then 876 else 1000 end,
 wins=case right(id::text,1) when '1' then 9 when '2' then 2 else 0 end,
 losses=case right(id::text,1) when '2' then 9 when '1' then 2 else 0 end,
 doubles_wins=case right(id::text,1) when '1' then 1 else 0 end;
insert into public.doubles_teams(id,name,created_by,player_one_id,player_two_id,rating,wins,losses) values
 ('10000000-0000-4000-8000-000000000001','Maple Aces','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',1111,6,2),
 ('10000000-0000-4000-8000-000000000002','Net Ninjas','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004',889,2,6);
insert into public.matches(id,player_one_id,player_two_id,winner_id,loser_id,player_one_score,player_two_score,score_summary,rating_delta,created_at)
select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',11,7,'11-7, 9-11, 11-8',16,
 case i when 1 then '2026-09-07 23:59 America/Toronto'::timestamptz else '2026-09-08 08:00 America/Toronto'::timestamptz end from generate_series(1,2) i;
insert into public.doubles_matches(id,team_one_id,team_two_id,winner_team_id,loser_team_id,team_one_score,team_two_score,score_summary,team_rating_delta,player_rating_delta,profile_rating_delta,created_at)
values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',11,4,'11-4',12,10,10,'2026-09-08 08:01 America/Toronto');
insert into public.match_reports(id,reporter_id,opponent_id,player_one_id,player_two_id,winner_id,score_summary)
values('40000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','11-5');
insert into public.doubles_match_reports(id,reporter_id,team_one_id,team_two_id,winner_team_id,responder_team_id,score_summary)
values('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','11-6');
insert into public.profile_achievements(profile_id,achievement_key) values('00000000-0000-4000-8000-000000000001','first_win');
create schema fixture;
create table fixture.profiles as select * from public.profiles;
create table fixture.teams as select * from public.doubles_teams;
create table fixture.matches as select * from public.matches;
create table fixture.doubles_matches as select * from public.doubles_matches;
create table fixture.achievements as select * from public.profile_achievements;
