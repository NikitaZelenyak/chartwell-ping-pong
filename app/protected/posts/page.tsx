import { ChevronLeft, ChevronRight, MessagesSquare, ShieldAlert } from "lucide-react";
import Link from "@/components/arcade-link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-forms";
import { ScoreboardSkeleton } from "@/components/ping-pong-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { enrichPosts, POST_SELECT, type RawPost } from "@/lib/posts-server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 15;

export default function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <Suspense fallback={<PostsFallback />}>
      <PostsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PostsContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const postsResult = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  const rawPosts = (postsResult.data ?? []) as unknown as RawPost[];
  const hasNext = rawPosts.length > PAGE_SIZE;
  const { posts, error: enrichmentError } = await enrichPosts(
    supabase,
    rawPosts.slice(0, PAGE_SIZE),
    user.id,
  );
  const setupError = postsResult.error?.message ?? enrichmentError;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 sm:gap-8">
      <section className="arena-page-header season-panel overflow-hidden">
        <div className="relative p-4 sm:p-6">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-14 size-40 rounded-full bg-primary/10 blur-2xl"
          />
          <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            Player community
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
            Posts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Share a great point, a useful video, or a thought with the Chartwell
            ping-pong community.
          </p>
        </div>
      </section>

      {setupError ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Community tables are not ready yet.</p>
            <p className="mt-1 break-words">{setupError}</p>
          </div>
        </div>
      ) : null}

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessagesSquare className="size-5" />
            Start a rally
          </CardTitle>
          <CardDescription>
            Add a thought, one video link, or both.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostComposer />
        </CardContent>
      </Card>

      <section aria-label="Community posts" className="grid gap-5">
        {posts.map((post) => (
          <PostCard currentUserId={user.id} key={post.id} post={post} />
        ))}

        {!setupError && posts.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/70 p-8 text-center">
            <MessagesSquare className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-semibold">
              {page === 1 ? "The feed is ready for its first post" : "No posts on this page"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {page === 1
                ? "Share a thought or video above to get the conversation moving."
                : "Return to the previous page to keep browsing."}
            </p>
          </div>
        ) : null}
      </section>

      {(page > 1 || hasNext) && !setupError ? (
        <nav
          aria-label="Posts pagination"
          className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3"
        >
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={page === 2 ? "/protected/posts" : `/protected/posts?page=${page - 1}`}>
                <ChevronLeft />
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Button asChild variant="outline">
              <Link href={`/protected/posts?page=${page + 1}`}>
                Next
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function PostsFallback() {
  return <ScoreboardSkeleton kind="posts" label="Loading community posts…" />;
}
