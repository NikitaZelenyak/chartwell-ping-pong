alter table public.profiles
add column if not exists card_style text not null default 'default';
