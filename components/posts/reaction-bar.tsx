"use client";

import { batBall } from "@lucide/lab";
import { Icon, MessageCircle } from "lucide-react";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { PostReaction } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { togglePostReaction } from "@/app/protected/posts/actions";

type ReactionState = {
  pingCount: number;
  pongCount: number;
  currentReaction: PostReaction | null;
};

function optimisticReaction(
  state: ReactionState,
  selected: PostReaction,
): ReactionState {
  if (state.currentReaction === selected) {
    return {
      ...state,
      [`${selected}Count`]: Math.max(0, state[`${selected}Count`] - 1),
      currentReaction: null,
    };
  }

  const next = { ...state };

  if (state.currentReaction) {
    const previousKey = `${state.currentReaction}Count` as const;
    next[previousKey] = Math.max(0, next[previousKey] - 1);
  }

  const selectedKey = `${selected}Count` as const;
  next[selectedKey] += 1;
  next.currentReaction = selected;
  return next;
}

export function ReactionBar({
  postId,
  pingCount,
  pongCount,
  commentCount,
  currentReaction,
}: ReactionState & {
  postId: string;
  commentCount: number;
}) {
  const [confirmed, setConfirmed] = useState<ReactionState>({
    pingCount,
    pongCount,
    currentReaction,
  });
  const [optimistic, setOptimistic] = useOptimistic(
    confirmed,
    optimisticReaction,
  );
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [animation, setAnimation] = useState<{
    reaction: PostReaction;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (!isPending) {
      setConfirmed({ pingCount, pongCount, currentReaction });
    }
  }, [currentReaction, isPending, pingCount, pongCount]);

  function react(reaction: PostReaction) {
    if (isPending) {
      return;
    }

    setStatus("");
    setAnimation({ reaction, key: Date.now() });

    startTransition(async () => {
      setOptimistic(reaction);
      const result = await togglePostReaction(postId, reaction);

      if (!result.ok) {
        setStatus(result.message ?? "That reaction could not be saved.");
        return;
      }

      setConfirmed({
        pingCount: result.pingCount,
        pongCount: result.pongCount,
        currentReaction: result.currentReaction,
      });
      setStatus(
        result.currentReaction
          ? `${result.currentReaction === "ping" ? "Ping" : "Pong"} saved.`
          : "Reaction removed.",
      );
    });
  }

  return (
    <div>
      <div className="relative flex flex-wrap items-center gap-2 border-y py-3">
        <ReactionButton
          count={optimistic.pingCount}
          disabled={isPending}
          label="Ping"
          onClick={() => react("ping")}
          pressed={optimistic.currentReaction === "ping"}
          reaction="ping"
        />
        <ReactionButton
          count={optimistic.pongCount}
          disabled={isPending}
          label="Pong"
          onClick={() => react("pong")}
          pressed={optimistic.currentReaction === "pong"}
          reaction="pong"
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="size-4" />
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </span>

        {animation ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-[5.25rem] top-1/2 size-2.5 rounded-full bg-chart-4 shadow-[0_0_10px_hsl(var(--chart-4)/0.8)]",
              animation.reaction === "ping"
                ? "animate-post-reaction-ping"
                : "animate-post-reaction-pong",
            )}
            key={animation.key}
          />
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      {status && status.includes("could not") ? (
        <p className="mt-2 text-xs text-destructive">{status}</p>
      ) : null}
    </div>
  );
}

function ReactionButton({
  count,
  disabled,
  label,
  onClick,
  pressed,
  reaction,
}: {
  count: number;
  disabled: boolean;
  label: string;
  onClick: () => void;
  pressed: boolean;
  reaction: PostReaction;
}) {
  return (
    <Button
      aria-label={`${label}: ${count} ${count === 1 ? "vote" : "votes"}`}
      aria-pressed={pressed}
      className={cn(
        "relative min-w-24",
        pressed &&
          (reaction === "ping"
            ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-chart-3/35 bg-chart-3/10 text-chart-3 hover:bg-chart-3/15"),
      )}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      <Icon
        className={cn(reaction === "pong" && "-scale-x-100")}
        iconNode={batBall}
      />
      {label}
      <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] tabular-nums">
        {count}
      </span>
    </Button>
  );
}
