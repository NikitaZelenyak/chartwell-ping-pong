import { ArrowLeft, MessageCircle, ShieldAlert } from "lucide-react";
import Link from "@/components/arcade-link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PostCard } from "@/components/posts/post-card";
import { PostComment } from "@/components/posts/post-comment";
import { CommentComposer } from "@/components/posts/post-forms";
import { ScoreboardSkeleton } from "@/components/ping-pong-loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  enrichPosts,
  loadPostComments,
  POST_SELECT,
  type RawPost,
} from "@/lib/posts-server";
import { createClient } from "@/lib/supabase/server";

export default function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  return (
    <Suspense fallback={<PostDetailFallback />}>
      <PostDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PostDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const postResult = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (postResult.error) {
    throw new Error(postResult.error.message);
  }

  if (!postResult.data) {
    notFound();
  }

  const [{ posts, error: enrichmentError }, commentsResult] = await Promise.all([
    enrichPosts(
      supabase,
      [postResult.data as unknown as RawPost],
      user.id,
      false,
    ),
    loadPostComments(supabase, id),
  ]);
  const post = posts[0];

  if (!post) {
    notFound();
  }

  const setupError = enrichmentError ?? commentsResult.error;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Button asChild className="w-full sm:w-fit" variant="outline">
        <Link href="/protected/posts">
          <ArrowLeft />
          Back to posts
        </Link>
      </Button>

      {setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{setupError}</p>
        </div>
      ) : null}

      <PostCard
        currentUserId={user.id}
        detail
        editMode={query.edit === "1"}
        post={post}
      />

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageCircle className="size-5" />
            Discussion
          </CardTitle>
          <CardDescription>
            Comments are shown oldest first so the conversation reads naturally.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <CommentComposer postId={post.id} />

          <div className="grid gap-3 border-t pt-5">
            {commentsResult.comments.map((comment) => (
              <PostComment
                comment={comment}
                currentUserId={user.id}
                key={comment.id}
              />
            ))}
            {commentsResult.comments.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No comments yet. Be the first to return the rally.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PostDetailFallback() {
  return <ScoreboardSkeleton kind="posts" label="Loading the discussion…" />;
}
