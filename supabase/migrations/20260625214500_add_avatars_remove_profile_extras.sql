alter table public.profiles
add column if not exists avatar_style text not null default 'lorelei',
add column if not exists avatar_seed text;

update public.profiles
set avatar_seed = coalesce(nullif(avatar_seed, ''), id::text)
where avatar_seed is null or avatar_seed = '';

alter table public.profiles
alter column avatar_seed set not null,
alter column avatar_seed set default 'chartwell-player';

alter table public.profiles
drop column if exists handle,
drop column if exists home_club;

alter table public.tournaments
add column if not exists avatar_style text not null default 'shapes',
add column if not exists avatar_seed text;

update public.tournaments
set avatar_seed = coalesce(nullif(avatar_seed, ''), id::text)
where avatar_seed is null or avatar_seed = '';

alter table public.tournaments
alter column avatar_seed set not null,
alter column avatar_seed set default 'chartwell-tournament';
