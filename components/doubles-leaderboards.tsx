"use client";

import { Crown, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TeamLeaderboardItem = {
  id: string;
  name: string;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  playerOneId: string;
  playerOne: string;
  playerTwoId: string;
  playerTwo: string;
};

const PAGE_SIZE = 6;

export function DoublesTeamLeaderboard({
  teams,
}: {
  teams: TeamLeaderboardItem[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleTeams = teams.slice(0, visibleCount);
  const remaining = Math.max(0, teams.length - visibleCount);

  if (teams.length === 0) {
    return <EmptyLeaderboard text="No doubles teams yet." />;
  }

  return (
    <div className="space-y-3">
      {visibleTeams.map((team, index) => {
        const rank = index + 1;
        return (
          <div
            className={cn(
              "rounded-md border bg-background/80 p-3",
              rank === 1 &&
                "border-amber-300 bg-gradient-to-r from-amber-100 to-background shadow-md shadow-amber-200/40 dark:border-amber-500/50 dark:from-amber-950/40",
            )}
            key={team.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-md text-sm font-semibold text-muted-foreground",
                      rank === 1 && "bg-amber-400 text-amber-950",
                    )}
                  >
                    #{rank}
                  </span>
                  <p className="break-words font-semibold">{team.name}</p>
                  {rank === 1 ? (
                    <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400">
                      <Crown className="mr-1 size-3" />
                      Top team
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <Link
                    href={`/protected/players/${team.playerOneId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {team.playerOne}
                  </Link>{" "}
                  +{" "}
                  <Link
                    href={`/protected/players/${team.playerTwoId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {team.playerTwo}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {team.wins ?? 0}-{team.losses ?? 0} doubles record
                </p>
              </div>
              <Badge variant={rank === 1 ? "default" : "secondary"}>
                {team.rating ?? 1000}
              </Badge>
            </div>
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
          Load more teams ({remaining})
        </Button>
      ) : null}
    </div>
  );
}

function EmptyLeaderboard({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      <UsersRound className="mx-auto mb-2 size-5" />
      {text}
    </div>
  );
}
