import { MessageCircle, Video } from "lucide-react";
import Link from "@/components/arcade-link";

import { PostAvatar } from "@/components/posts/post-avatar";
import {
  PostEditor,
  PostOwnerControls,
} from "@/components/posts/post-forms";
import { ReactionBar } from "@/components/posts/reaction-bar";
import { VideoEmbed } from "@/components/posts/video-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  displayCommunityProfile,
  type CommunityComment,
  type CommunityPost,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

function wasEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

export function PostCard({
  post,
  currentUserId,
  detail = false,
  editMode = false,
}: {
  post: CommunityPost;
  currentUserId: string;
  detail?: boolean;
  editMode?: boolean;
}) {
  const authorName = displayCommunityProfile(post.author);
  const isOwner = post.authorId === currentUserId;

  return (
    <article
      className={cn(
        "season-panel scroll-mt-24",
        detail && "shadow-md",
      )}
      id={`post-${post.id}`}
    >
      <div className="p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <Link
            className="group flex min-w-0 items-center gap-3"
            href={`/protected/players/${post.author.id}`}
          >
            <PostAvatar profile={post.author} />
            <span className="min-w-0">
              <span className="block truncate font-semibold group-hover:text-primary">
                {authorName}
              </span>
              <span className="block text-xs text-muted-foreground">
                <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
                  {post.timeLabel}
                </time>
                {wasEdited(post.createdAt, post.updatedAt) ? " · Edited" : ""}
              </span>
            </span>
          </Link>
          {!detail && isOwner ? <PostOwnerControls postId={post.id} /> : null}
          {!isOwner ? (
            <Badge className="bg-muted text-muted-foreground hover:bg-muted" variant="secondary">
              Community post
            </Badge>
          ) : null}
        </header>

        {detail && isOwner ? (
          <div className="mt-4">
            <PostEditor defaultOpen={editMode} post={post} />
          </div>
        ) : null}

        {post.body ? (
          <p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7">
            {post.body}
          </p>
        ) : null}

        {post.videoUrl && post.videoProvider ? (
          <div className="mt-5">
            <VideoEmbed
              provider={post.videoProvider}
              url={post.videoUrl}
              videoKey={post.videoKey}
            />
          </div>
        ) : null}

        {!post.body && post.videoUrl ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Video className="size-4" />
            Video shared without additional commentary
          </div>
        ) : null}

        <div className="mt-5">
          <ReactionBar
            commentCount={post.commentCount}
            currentReaction={post.currentReaction}
            pingCount={post.pingCount}
            pongCount={post.pongCount}
            postId={post.id}
          />
        </div>

        {!detail ? (
          <div className="mt-4">
            {post.recentComments.length > 0 ? (
              <div className="space-y-2">
                {post.recentComments.map((comment) => (
                  <CommentPreview comment={comment} key={comment.id} />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No comments yet. Start the rally.
              </p>
            )}
            <Button asChild className="mt-3 w-full sm:w-auto" variant="outline">
              <Link href={`/protected/posts/${post.id}`}>
                <MessageCircle />
                {post.commentCount > 0 ? "View discussion" : "Add a comment"}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CommentPreview({ comment }: { comment: CommunityComment }) {
  return (
    <div className="flex gap-2.5 rounded-md bg-muted/40 p-3">
      <PostAvatar className="size-8" profile={comment.author} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {displayCommunityProfile(comment.author)}
          </span>{" "}
          · {comment.timeLabel}
        </p>
        <p className="mt-1 line-clamp-2 break-words text-sm">{comment.body}</p>
      </div>
    </div>
  );
}
