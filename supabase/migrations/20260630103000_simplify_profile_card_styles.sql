alter table public.profiles
  add column if not exists card_style text not null default 'default';

update public.profiles
set card_style = case
  when card_style in ('bronze-court', 'bronze-rally', 'bronze-glow') then 'bronze-bg'
  when card_style in ('silver-court', 'silver-grid', 'silver-pulse') then 'silver-bg'
  when card_style in ('gold-champion', 'gold-arena', 'gold-spotlight') then 'gold-bg'
  when card_style in ('default', 'bronze-bg', 'silver-bg', 'gold-bg', 'champion-gradient') then card_style
  else 'default'
end;
