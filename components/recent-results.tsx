"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RecentResult = {
  id: string;
  playerOne: string;
  playerTwo: string;
  winner: string;
  score: string;
  date: string;
  ratingDelta: number;
};

const PAGE_SIZE = 5;

export function RecentResults({ results }: { results: RecentResult[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleResults = results.slice(0, visibleCount);
  const remaining = Math.max(0, results.length - visibleCount);

  if (results.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No match results reported yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleResults.map((match) => (
        <div className="rounded-md border p-4" key={match.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">
                {match.playerOne} vs {match.playerTwo}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Winner: {match.winner}
              </p>
            </div>
            <Badge variant="secondary">
              {match.ratingDelta > 0 ? "+" : ""}
              {match.ratingDelta}
            </Badge>
          </div>
          <p className="mt-3 break-words text-sm text-muted-foreground">
            {match.score} · {match.date}
          </p>
        </div>
      ))}

      {remaining > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Load more results ({remaining})
        </Button>
      ) : null}
    </div>
  );
}
