"use client";

import { Check, LoaderCircle, Pencil, Send, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMENT_BODY_MAX_LENGTH,
  EMPTY_POST_ACTION_STATE,
  POST_BODY_MAX_LENGTH,
  type CommunityPost,
} from "@/lib/posts";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  updateComment,
  updatePost,
} from "@/app/protected/posts/actions";

function FieldError({ children }: { children?: string }) {
  return children ? (
    <p className="text-xs text-destructive" role="alert">
      {children}
    </p>
  ) : null;
}

export function PostComposer() {
  const [state, action, pending] = useActionState(
    createPost,
    EMPTY_POST_ACTION_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const handledPost = useRef<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok || !state.postId || handledPost.current === state.postId) {
      return;
    }

    handledPost.current = state.postId;
    formRef.current?.reset();
    setCelebrating(true);
    router.refresh();

    const highlightTimer = window.setTimeout(() => {
      document
        .getElementById(`post-${state.postId}`)
        ?.classList.add("animate-published-post");
    }, 180);
    const celebrationTimer = window.setTimeout(() => setCelebrating(false), 1100);

    return () => {
      window.clearTimeout(highlightTimer);
      window.clearTimeout(celebrationTimer);
    };
  }, [router, state.ok, state.postId]);

  return (
    <form action={action} className="relative grid gap-4" ref={formRef}>
      <div className="grid gap-2">
        <Label htmlFor="post-body">Your thoughts</Label>
        <Textarea
          aria-describedby="post-body-help post-body-error"
          className="min-h-28 resize-y"
          id="post-body"
          maxLength={POST_BODY_MAX_LENGTH}
          name="body"
          placeholder="Share a rally, a tip, or what stood out in the video…"
        />
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span id="post-body-help">Plain text, up to {POST_BODY_MAX_LENGTH} characters.</span>
          <span>Optional</span>
        </div>
        <div id="post-body-error">
          <FieldError>{state.fieldErrors?.body}</FieldError>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="post-video-url">Video link</Label>
        <Input
          aria-describedby="post-video-help post-video-error"
          id="post-video-url"
          inputMode="url"
          name="video_url"
          placeholder="https://youtube.com/watch?v=…"
          type="url"
        />
        <p className="text-xs text-muted-foreground" id="post-video-help">
          YouTube, Vimeo, TikTok, and Instagram play inline. Other HTTPS links
          open safely in a new tab.
        </p>
        <div id="post-video-error">
          <FieldError>{state.fieldErrors?.videoUrl}</FieldError>
        </div>
      </div>
      <FieldError>{state.fieldErrors?.form}</FieldError>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Send />
              Publish post
            </>
          )}
        </Button>
        {state.ok ? (
          <p aria-live="polite" className="text-sm font-medium text-primary" role="status">
            {state.message}
          </p>
        ) : null}
      </div>

      {celebrating ? <PublishCelebration /> : null}
    </form>
  );
}

function PublishCelebration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden"
    >
      <span className="absolute bottom-2 left-1/2 h-8 w-px bg-primary/35" />
      <span className="animate-post-publish-ball absolute bottom-7 left-4 size-3 rounded-full bg-chart-4 shadow-[0_0_12px_hsl(var(--chart-4)/0.8)]" />
      <Sparkles className="animate-post-publish-spark absolute bottom-8 right-5 size-5 text-chart-4" />
    </div>
  );
}

export function PostOwnerControls({
  postId,
  detail = false,
}: {
  postId: string;
  detail?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button asChild size="sm" variant="ghost">
        <Link href={`/protected/posts/${postId}?edit=1`}>
          <Pencil />
          Edit
        </Link>
      </Button>
      <form
        action={deletePost}
        onSubmit={(event) => {
          if (!window.confirm("Delete this post and all of its comments?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="post_id" type="hidden" value={postId} />
        <Button
          aria-label={detail ? "Delete this post" : "Delete post"}
          size="sm"
          type="submit"
          variant="ghost"
        >
          <Trash2 />
          Delete
        </Button>
      </form>
    </div>
  );
}

export function PostEditor({
  post,
  defaultOpen,
}: {
  post: CommunityPost;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(
    updatePost,
    EMPTY_POST_ACTION_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    setOpen(false);
    router.replace(`/protected/posts/${post.id}`);
    router.refresh();
  }, [post.id, router, state]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Button onClick={() => setOpen(true)} size="sm" type="button" variant="ghost">
          <Pencil />
          Edit
        </Button>
        <PostDeleteOnly postId={post.id} />
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 rounded-md border bg-muted/25 p-4">
      <input name="post_id" type="hidden" value={post.id} />
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Edit post</p>
        <Button
          aria-label="Cancel editing"
          onClick={() => setOpen(false)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`edit-post-body-${post.id}`}>Your thoughts</Label>
        <Textarea
          defaultValue={post.body ?? ""}
          id={`edit-post-body-${post.id}`}
          maxLength={POST_BODY_MAX_LENGTH}
          name="body"
        />
        <FieldError>{state.fieldErrors?.body}</FieldError>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`edit-post-video-${post.id}`}>Video link</Label>
        <Input
          defaultValue={post.videoUrl ?? ""}
          id={`edit-post-video-${post.id}`}
          name="video_url"
          type="url"
        />
        <FieldError>{state.fieldErrors?.videoUrl}</FieldError>
      </div>
      <FieldError>{state.fieldErrors?.form}</FieldError>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button onClick={() => setOpen(false)} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PostDeleteOnly({ postId }: { postId: string }) {
  return (
    <form
      action={deletePost}
      onSubmit={(event) => {
        if (!window.confirm("Delete this post and all of its comments?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="post_id" type="hidden" value={postId} />
      <Button size="sm" type="submit" variant="ghost">
        <Trash2 />
        Delete
      </Button>
    </form>
  );
}

export function CommentComposer({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(
    createComment,
    EMPTY_POST_ACTION_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={action} className="grid gap-3" ref={formRef}>
      <input name="post_id" type="hidden" value={postId} />
      <div className="grid gap-2">
        <Label htmlFor={`new-comment-${postId}`}>Add to the discussion</Label>
        <Textarea
          className="min-h-24"
          id={`new-comment-${postId}`}
          maxLength={COMMENT_BODY_MAX_LENGTH}
          name="body"
          placeholder="Write a comment…"
        />
        <FieldError>{state.fieldErrors?.body}</FieldError>
      </div>
      <FieldError>{state.fieldErrors?.form}</FieldError>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
          {pending ? "Posting…" : "Post comment"}
        </Button>
        {state.ok ? (
          <p aria-live="polite" className="text-sm text-primary" role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function CommentOwnerControls({
  body,
  commentId,
  postId,
}: {
  body: string;
  commentId: string;
  postId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    updateComment,
    EMPTY_POST_ACTION_STATE,
  );

  useEffect(() => {
    if (state.ok) {
      setEditing(false);
    }
  }, [state]);

  if (editing) {
    return (
      <form action={action} className="mt-3 grid gap-2">
        <input name="post_id" type="hidden" value={postId} />
        <input name="comment_id" type="hidden" value={commentId} />
        <Textarea defaultValue={body} maxLength={COMMENT_BODY_MAX_LENGTH} name="body" />
        <FieldError>{state.fieldErrors?.body ?? state.fieldErrors?.form}</FieldError>
        <div className="flex gap-2">
          <Button disabled={pending} size="sm" type="submit">
            {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
            Save
          </Button>
          <Button
            onClick={() => setEditing(false)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button onClick={() => setEditing(true)} size="sm" type="button" variant="ghost">
        <Pencil />
        Edit
      </Button>
      <form
        action={deleteComment}
        onSubmit={(event) => {
          if (!window.confirm("Delete this comment?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="post_id" type="hidden" value={postId} />
        <input name="comment_id" type="hidden" value={commentId} />
        <Button size="sm" type="submit" variant="ghost">
          <Trash2 />
          Delete
        </Button>
      </form>
    </div>
  );
}
