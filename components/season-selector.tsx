"use client";

import { useRouter } from "next/navigation";
import { beginNavigation, endNavigation } from "@/components/navigation-feedback";
import { useEffect, useTransition } from "react";
import { Select } from "@/components/ui/select";
import type { Season } from "@/lib/seasons";

export function SeasonSelector({ seasons, selectedId, kind = "player" }: {
  seasons: Season[]; selectedId: string; kind?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!pending) endNavigation(); }, [pending]);
  return <div className="min-w-52 space-y-2">
    <label htmlFor="season-selector" className="text-xs font-semibold uppercase tracking-[0.16em]">Explore a season</label>
    <Select id="season-selector" value={selectedId} disabled={pending} className="border-white/30 bg-white/10 text-inherit [&_option]:text-foreground [&_option]:bg-background"
      onChange={(event) => { const href = `/protected/seasons?season=${event.target.value}&kind=${kind}`; beginNavigation(href); startTransition(() => router.push(href)); }}>
      {seasons.map((season) => <option key={season.id} value={season.id}>{season.name} · {season.status === "active" ? "Current" : "Archived"}</option>)}
    </Select>
    <span className="sr-only" role="status">{pending ? "Loading season…" : ""}</span>
  </div>;
}
