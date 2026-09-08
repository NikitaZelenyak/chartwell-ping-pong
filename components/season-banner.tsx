import Link from "@/components/arcade-link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { getActiveSeason } from "@/lib/seasons-server";
import { seasonDate } from "@/lib/seasons";

export async function SeasonBanner() {
  const season = await getActiveSeason().catch(() => null);
  return <Link href="/protected/seasons" className="season-strip group mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-card/85 px-4 py-3 text-sm shadow-sm">
    <span className="flex items-center gap-2"><Leaf className="size-4 text-primary" /><strong>{season?.name ?? "Season center"}</strong>
      {season ? <span className="hidden text-muted-foreground sm:inline">{Date.now() >= Date.parse(season.ends_at) ? "Awaiting next season" : `Playing through ${seasonDate(new Date(Date.parse(season.ends_at)-1).toISOString())}`}</span> : null}
    </span>
    <span className="flex items-center gap-1 text-xs font-medium text-primary">Standings & season history <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
  </Link>;
}

export async function SeasonInput() {
  const season = await getActiveSeason();
  return <input type="hidden" name="season_id" value={season?.id ?? ""} />;
}
