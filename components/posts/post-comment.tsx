import Link from "@/components/arcade-link";

import { PostAvatar } from "@/components/posts/post-avatar";
import { CommentOwnerControls } from "@/components/posts/post-forms";
import {
  displayCommunityProfile,
  type CommunityComment,
} from "@/lib/posts";

function wasEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

export function PostComment({
  comment,
  currentUserId,
}: {
  comment: CommunityComment;
  currentUserId: string;
}) {
  return (
    <article className="flex gap-3 rounded-md border bg-card p-4" id={`comment-${comment.id}`}>
      <Link href={`/protected/players/${comment.author.id}`}>
        <PostAvatar className="size-9" profile={comment.author} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link
              className="font-medium hover:text-primary"
              href={`/protected/players/${comment.author.id}`}
            >
              {displayCommunityProfile(comment.author)}
            </Link>
            <p className="text-xs text-muted-foreground">
              <time dateTime={comment.createdAt}>{comment.timeLabel}</time>
              {wasEdited(comment.createdAt, comment.updatedAt) ? " · Edited" : ""}
            </p>
          </div>
          {comment.authorId === currentUserId ? (
            <CommentOwnerControls
              body={comment.body}
              commentId={comment.id}
              postId={comment.postId}
            />
          ) : null}
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
          {comment.body}
        </p>
      </div>
    </article>
  );
}
