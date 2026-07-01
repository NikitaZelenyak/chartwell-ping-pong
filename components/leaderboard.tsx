"use client";

import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  avatarUrl,
  initialsAvatarColors,
  initialsForName,
  isInitialsAvatar,
} from "@/lib/avatars";
import { cn } from "@/lib/utils";

type LeaderboardProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  avatar_style: string | null;
  avatar_seed: string | null;
};

const PAGE_SIZE = 8;

function displayPlayer(profile: LeaderboardProfile) {
  return profile.display_name || profile.email || "Player";
}

function rankMeta(rank: number) {
  if (rank === 2) {
    return {
      icon: <Medal className="size-4" />,
      label: "Runner up",
      rowClass:
        "border-slate-300 bg-gradient-to-r from-slate-100 to-background dark:border-slate-500/50 dark:from-slate-800/50",
      rankClass: "bg-slate-300 text-slate-950",
      badgeClass: "bg-slate-200 text-slate-950 hover:bg-slate-200",
    };
  }

  if (rank === 3) {
    return {
      icon: <Medal className="size-4" />,
      label: "Top three",
      rowClass:
        "border-orange-300 bg-gradient-to-r from-orange-100 to-background dark:border-orange-500/50 dark:from-orange-950/35",
      rankClass: "bg-orange-300 text-orange-950",
      badgeClass: "bg-orange-200 text-orange-950 hover:bg-orange-200",
    };
  }

  return null;
}

export function Leaderboard({
  currentUserId,
  profiles,
}: {
  currentUserId: string;
  profiles: LeaderboardProfile[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleProfiles = profiles.slice(0, visibleCount);
  const remaining = Math.max(0, profiles.length - visibleCount);

  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Create your profile to start the leaderboard.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleProfiles.map((profile, index) => {
        const rank = index + 1;
        const meta = rankMeta(rank);
        const isCurrentUser = profile.id === currentUserId;

        if (rank === 1) {
          return (
            <ChampionCard
              isCurrentUser={isCurrentUser}
              key={profile.id}
              profile={profile}
            />
          );
        }

        return (
          <div
            className={cn(
              "grid grid-cols-[2.35rem_2.75rem_1fr_auto] items-center gap-3 rounded-md border bg-background/80 p-3 transition hover:border-primary/35",
              meta?.rowClass,
              isCurrentUser && "ring-1 ring-primary/35",
            )}
            key={profile.id}
          >
            <div
              className={cn(
                "grid size-9 place-items-center rounded-md text-sm font-semibold text-muted-foreground",
                meta?.rankClass,
              )}
            >
              #{rank}
            </div>
            <Link
              href={`/protected/players/${profile.id}`}
              aria-label={`Open ${displayPlayer(profile)} profile card`}
            >
              <LeaderboardAvatar profile={profile} rank={rank} />
            </Link>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link
                  href={`/protected/players/${profile.id}`}
                  className="truncate font-medium hover:text-primary hover:underline"
                >
                  {displayPlayer(profile)}
                </Link>
                {meta ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                    {meta.icon}
                    {meta.label}
                  </span>
                ) : null}
                {isCurrentUser ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] font-medium text-primary">
                    You
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {profile.wins ?? 0}-{profile.losses ?? 0} record
              </p>
            </div>
            <Badge
              className={cn(meta?.badgeClass)}
              variant={meta ? "default" : isCurrentUser ? "default" : "secondary"}
            >
              {profile.rating ?? 1000}
            </Badge>
          </div>
        );
      })}

      {remaining > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Load more players ({remaining})
        </Button>
      ) : null}
    </div>
  );
}

function ChampionCard({
  isCurrentUser,
  profile,
}: {
  isCurrentUser: boolean;
  profile: LeaderboardProfile;
}) {
  const wins = profile.wins ?? 0;
  const losses = profile.losses ?? 0;
  const rating = profile.rating ?? 1000;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-amber-300 bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.42),transparent_30%),linear-gradient(135deg,#fff7cc,#fffef4_48%,hsl(var(--background)))] p-4 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-200/60 dark:border-amber-500/60 dark:bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.34),transparent_30%),linear-gradient(135deg,rgba(120,53,15,0.72),rgba(69,26,3,0.3)_48%,hsl(var(--card)))]",
        isCurrentUser && "ring-2 ring-primary/40",
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-amber-300/30 blur-2xl" />
      <div className="pointer-events-none absolute bottom-3 right-4 hidden text-8xl font-black leading-none text-amber-300/20 sm:block">
        #1
      </div>

      <div className="relative grid gap-4 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center">
        <div className="flex items-center gap-3 sm:block">
          <div className="relative">
            <Link
              href={`/protected/players/${profile.id}`}
              aria-label={`Open ${displayPlayer(profile)} profile card`}
            >
              <LeaderboardAvatar
                className="size-16 ring-4 ring-amber-300/80"
                profile={profile}
                rank={1}
              />
            </Link>
            <div className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-md shadow-amber-300/50">
              <Crown className="size-4" />
            </div>
          </div>
          <div className="sm:hidden">
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm">
              <Trophy className="size-3.5" />
              Current Champion
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm">
              <Trophy className="size-3.5" />
              Current Champion
            </span>
            {isCurrentUser ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                You
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={`/protected/players/${profile.id}`}
              className="truncate text-2xl font-semibold tracking-normal text-foreground hover:text-primary hover:underline"
            >
              {displayPlayer(profile)}
            </Link>
            {isCurrentUser ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] font-medium text-primary sm:hidden">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads the table with the strongest rating in the club.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <ChampionStat label="Wins" value={wins} />
            <ChampionStat label="Losses" value={losses} />
            <ChampionStat label="Record" value={`${wins}-${losses}`} />
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-amber-300/70 bg-white/65 p-3 text-center shadow-sm backdrop-blur dark:bg-amber-950/20 sm:min-w-28">
          <p className="text-xs font-medium uppercase tracking-normal text-amber-700 dark:text-amber-200">
            Rating
          </p>
          <p className="text-3xl font-bold text-amber-800 dark:text-amber-100">
            {rating}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChampionStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-amber-200/80 bg-white/60 px-3 py-2 shadow-sm dark:border-amber-700/40 dark:bg-amber-950/20">
      <p className="text-[0.68rem] font-medium uppercase tracking-normal text-amber-700 dark:text-amber-200">
        {label}
      </p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function LeaderboardAvatar({
  className,
  profile,
  rank,
}: {
  className?: string;
  profile: LeaderboardProfile;
  rank: number;
}) {
  const label = displayPlayer(profile);
  const medalClass =
    rank === 1
      ? "ring-2 ring-amber-300"
      : rank === 2
        ? "ring-2 ring-slate-300"
        : rank === 3
          ? "ring-2 ring-orange-300"
          : "";

  if (isInitialsAvatar(profile.avatar_style)) {
    return (
      <div
        aria-label={`${label} initials avatar`}
        className={cn(
          "relative grid size-11 shrink-0 place-items-center rounded-md border font-semibold text-white shadow-sm",
          medalClass,
          className,
        )}
        role="img"
        style={initialsAvatarColors(profile.avatar_seed ?? label)}
      >
        {rank === 1 ? (
          <Sparkles className="absolute -right-1 -top-1 size-4 rounded-full bg-amber-300 p-0.5 text-amber-950" />
        ) : null}
        <span className="text-[clamp(0.75rem,32%,1.8rem)]">
          {initialsForName(label)}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label={`${label} avatar`}
      className={cn(
        "relative size-11 shrink-0 rounded-md border bg-accent bg-cover bg-center shadow-sm",
        medalClass,
        className,
      )}
      role="img"
      style={{
        backgroundImage: `url("${avatarUrl(profile.avatar_style, profile.avatar_seed)}")`,
      }}
    >
      {rank === 1 ? (
        <Sparkles className="absolute -right-1 -top-1 size-4 rounded-full bg-amber-300 p-0.5 text-amber-950" />
      ) : null}
    </div>
  );
}
