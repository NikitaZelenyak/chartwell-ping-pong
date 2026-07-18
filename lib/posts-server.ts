import "server-only";

import {
  formatRelativeTime,
  isPostReaction,
  isVideoProvider,
  type CommunityComment,
  type CommunityPost,
  type CommunityProfile,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const POST_SELECT = `
  id,
  author_id,
  body,
  video_url,
  video_provider,
  video_key,
  created_at,
  updated_at,
  author:profiles!posts_author_id_fkey(
    id,
    email,
    display_name,
    avatar_style,
    avatar_seed
  )
`;

type RawProfile = {
  id?: string;
  email?: string | null;
  display_name?: string | null;
  avatar_style?: string | null;
  avatar_seed?: string | null;
};

type RawPost = {
  id: string;
  author_id: string;
  body: string | null;
  video_url: string | null;
  video_provider: string | null;
  video_key: string | null;
  created_at: string;
  updated_at: string;
  author?: RawProfile | RawProfile[] | null;
};

type RawComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: RawProfile | RawProfile[] | null;
};

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function profileFromRaw(raw: RawProfile | null, fallbackId: string): CommunityProfile {
  return {
    id: raw?.id ?? fallbackId,
    email: raw?.email ?? null,
    displayName: raw?.display_name ?? null,
    avatarStyle: raw?.avatar_style ?? null,
    avatarSeed: raw?.avatar_seed ?? fallbackId,
  };
}

function commentFromRaw(raw: RawComment, now: Date): CommunityComment {
  return {
    id: raw.id,
    postId: raw.post_id,
    authorId: raw.author_id,
    body: raw.body,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    timeLabel: formatRelativeTime(raw.created_at, now),
    author: profileFromRaw(oneRelation(raw.author), raw.author_id),
  };
}

export async function enrichPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawPosts: RawPost[],
  currentUserId: string,
  includeRecentComments = true,
) {
  const postIds = rawPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return { posts: [] as CommunityPost[], error: null as string | null };
  }

  const [statsResult, reactionsResult, commentsResult] = await Promise.all([
    supabase
      .from("post_stats")
      .select("post_id,ping_count,pong_count,comment_count")
      .in("post_id", postIds),
    supabase
      .from("post_reactions")
      .select("post_id,reaction")
      .eq("user_id", currentUserId)
      .in("post_id", postIds),
    includeRecentComments
      ? supabase
          .from("post_recent_comments")
          .select(
            "id,post_id,author_id,body,created_at,updated_at,author_email,author_display_name,author_avatar_style,author_avatar_seed",
          )
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError =
    statsResult.error?.message ??
    reactionsResult.error?.message ??
    commentsResult.error?.message ??
    null;
  const statsByPost = new Map(
    (statsResult.data ?? []).map((row) => [row.post_id, row]),
  );
  const reactionByPost = new Map(
    (reactionsResult.data ?? []).map((row) => [row.post_id, row.reaction]),
  );
  const commentsByPost = new Map<string, CommunityComment[]>();
  const now = new Date();

  for (const raw of commentsResult.data ?? []) {
    const comment: CommunityComment = {
      id: raw.id,
      postId: raw.post_id,
      authorId: raw.author_id,
      body: raw.body,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      timeLabel: formatRelativeTime(raw.created_at, now),
      author: {
        id: raw.author_id,
        email: raw.author_email,
        displayName: raw.author_display_name,
        avatarStyle: raw.author_avatar_style,
        avatarSeed: raw.author_avatar_seed,
      },
    };
    commentsByPost.set(raw.post_id, [
      ...(commentsByPost.get(raw.post_id) ?? []),
      comment,
    ]);
  }

  const posts = rawPosts.map((raw): CommunityPost => {
    const stats = statsByPost.get(raw.id);
    const reaction = reactionByPost.get(raw.id);

    return {
      id: raw.id,
      authorId: raw.author_id,
      body: raw.body,
      videoUrl: raw.video_url,
      videoProvider: isVideoProvider(raw.video_provider) ? raw.video_provider : null,
      videoKey: raw.video_key,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      timeLabel: formatRelativeTime(raw.created_at, now),
      author: profileFromRaw(oneRelation(raw.author), raw.author_id),
      pingCount: Number(stats?.ping_count ?? 0),
      pongCount: Number(stats?.pong_count ?? 0),
      commentCount: Number(stats?.comment_count ?? 0),
      currentReaction: isPostReaction(reaction) ? reaction : null,
      recentComments: commentsByPost.get(raw.id) ?? [],
    };
  });

  return { posts, error: firstError };
}

export async function loadPostComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
) {
  const { data, error } = await supabase
    .from("post_comments")
    .select(
      `
        id,
        post_id,
        author_id,
        body,
        created_at,
        updated_at,
        author:profiles!post_comments_author_id_fkey(
          id,
          email,
          display_name,
          avatar_style,
          avatar_seed
        )
      `,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const now = new Date();
  return {
    comments: ((data ?? []) as unknown as RawComment[]).map((comment) =>
      commentFromRaw(comment, now),
    ),
    error: error?.message ?? null,
  };
}

export type { RawPost };
