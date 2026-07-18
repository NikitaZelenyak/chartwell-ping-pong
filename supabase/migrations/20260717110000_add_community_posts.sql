create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  video_url text,
  video_provider text,
  video_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length_check
    check (body is null or char_length(body) between 1 and 2000),
  constraint posts_video_url_length_check
    check (video_url is null or char_length(video_url) between 1 and 2048),
  constraint posts_content_check
    check (body is not null or video_url is not null),
  constraint posts_video_shape_check
    check (
      (
        video_url is null
        and video_provider is null
        and video_key is null
      )
      or
      (
        video_url ~ '^https://'
        and video_provider in ('youtube', 'vimeo', 'tiktok', 'instagram', 'external')
        and (
          (video_provider = 'external' and video_key is null)
          or
          (video_provider <> 'external' and nullif(video_key, '') is not null)
        )
      )
    )
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_comments_body_length_check
    check (char_length(body) between 1 and 1000)
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint post_reactions_reaction_check check (reaction in ('ping', 'pong'))
);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at
before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists post_reactions_set_updated_at on public.post_reactions;
create trigger post_reactions_set_updated_at
before update on public.post_reactions
for each row execute function public.set_updated_at();

create index if not exists posts_created_at_idx
on public.posts (created_at desc, id desc);

create index if not exists posts_author_id_idx
on public.posts (author_id, created_at desc);

create index if not exists post_comments_post_id_created_at_idx
on public.post_comments (post_id, created_at asc);

create index if not exists post_reactions_post_id_reaction_idx
on public.post_reactions (post_id, reaction);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;

drop policy if exists "Posts are visible to authenticated users" on public.posts;
create policy "Posts are visible to authenticated users"
on public.posts for select
to authenticated
using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
on public.posts for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "Authors can update their posts" on public.posts;
create policy "Authors can update their posts"
on public.posts for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts"
on public.posts for delete
to authenticated
using (author_id = auth.uid());

drop policy if exists "Comments are visible to authenticated users" on public.post_comments;
create policy "Comments are visible to authenticated users"
on public.post_comments for select
to authenticated
using (true);

drop policy if exists "Users can create their own comments" on public.post_comments;
create policy "Users can create their own comments"
on public.post_comments for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "Authors can update their comments" on public.post_comments;
create policy "Authors can update their comments"
on public.post_comments for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "Authors can delete their comments" on public.post_comments;
create policy "Authors can delete their comments"
on public.post_comments for delete
to authenticated
using (author_id = auth.uid());

drop policy if exists "Reactions are visible to authenticated users" on public.post_reactions;
create policy "Reactions are visible to authenticated users"
on public.post_reactions for select
to authenticated
using (true);

drop policy if exists "Users can create their own reactions" on public.post_reactions;
create policy "Users can create their own reactions"
on public.post_reactions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own reactions" on public.post_reactions;
create policy "Users can update their own reactions"
on public.post_reactions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own reactions" on public.post_reactions;
create policy "Users can delete their own reactions"
on public.post_reactions for delete
to authenticated
using (user_id = auth.uid());

create or replace view public.post_stats
with (security_invoker = true)
as
select
  posts.id as post_id,
  (
    select count(*)
    from public.post_reactions
    where post_reactions.post_id = posts.id
      and post_reactions.reaction = 'ping'
  ) as ping_count,
  (
    select count(*)
    from public.post_reactions
    where post_reactions.post_id = posts.id
      and post_reactions.reaction = 'pong'
  ) as pong_count,
  (
    select count(*)
    from public.post_comments
    where post_comments.post_id = posts.id
  ) as comment_count
from public.posts;

create or replace view public.post_recent_comments
with (security_invoker = true)
as
select
  ranked.id,
  ranked.post_id,
  ranked.author_id,
  ranked.body,
  ranked.created_at,
  ranked.updated_at,
  profiles.email as author_email,
  profiles.display_name as author_display_name,
  profiles.avatar_style as author_avatar_style,
  profiles.avatar_seed as author_avatar_seed
from (
  select
    post_comments.*,
    row_number() over (
      partition by post_comments.post_id
      order by post_comments.created_at desc, post_comments.id desc
    ) as comment_rank
  from public.post_comments
) as ranked
join public.profiles on profiles.id = ranked.author_id
where ranked.comment_rank <= 2;

create or replace function public.toggle_post_reaction(
  p_post_id uuid,
  p_reaction text
)
returns table (
  ping_count bigint,
  pong_count bigint,
  current_reaction text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_reaction not in ('ping', 'pong') then
    raise exception 'Reaction must be ping or pong';
  end if;

  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'Post not found';
  end if;

  select reaction
  into v_existing
  from public.post_reactions
  where post_id = p_post_id
    and user_id = v_user_id
  for update;

  if v_existing = p_reaction then
    delete from public.post_reactions
    where post_id = p_post_id
      and user_id = v_user_id;
    v_existing := null;
  else
    insert into public.post_reactions (post_id, user_id, reaction)
    values (p_post_id, v_user_id, p_reaction)
    on conflict (post_id, user_id)
    do update set reaction = excluded.reaction;
    v_existing := p_reaction;
  end if;

  return query
  select
    count(*) filter (where reaction = 'ping')::bigint,
    count(*) filter (where reaction = 'pong')::bigint,
    v_existing
  from public.post_reactions
  where post_id = p_post_id;
end;
$$;

revoke all on public.post_stats from public, anon;
grant select on public.post_stats to authenticated;

revoke all on public.post_recent_comments from public, anon;
grant select on public.post_recent_comments to authenticated;

revoke all on function public.toggle_post_reaction(uuid, text) from public;
grant execute on function public.toggle_post_reaction(uuid, text) to authenticated;
