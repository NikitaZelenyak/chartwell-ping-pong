import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Archive, Crown, Leaf, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSeasons } from "@/lib/seasons-server";
import { seasonDate, seasonProgress } from "@/lib/seasons";
import { SeasonSelector } from "@/components/season-selector";
import { SeasonOrganizer } from "@/components/season-organizer";
import { PingPongLoader } from "@/components/ping-pong-loader";
import { Button } from "@/components/ui/button";
import { APP_TIME_ZONE } from "@/lib/datetime";

type Snapshot = { id: string; display_name?: string; email?: string; name?: string; rating: number; wins: number; losses: number; player_one_name?: string; player_two_name?: string };
type Standing = { entity_id: string; rank: number; snapshot: Snapshot };
type Result = { id: string; player_one_id?: string; player_two_id?: string; winner_id?: string; team_one_id?: string; team_two_id?: string; winner_team_id?: string; player_one_score?: number; player_two_score?: number; team_one_score?: number; team_two_score?: number; score_summary?: string; created_at: string; rating_delta?: number; team_rating_delta?: number; status?: string; boundary_note?: string };
type Params = { season?: string; kind?: string; page?: string };
const PAGE_SIZE = 20;

export default function SeasonsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return <Suspense fallback={<PingPongLoader label="Opening the season archive…" />}><SeasonContent searchParams={searchParams} /></Suspense>;
}

async function SeasonContent({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  let seasons;
  try { seasons = await getSeasons(); } catch {
    return <section className="season-panel p-8"><Archive className="size-8 text-primary" /><h1 className="mt-4 text-2xl font-semibold">The season center is being prepared</h1><p className="mt-3 text-muted-foreground">Your existing results are still available. Season history will appear after the database update is complete.</p><Button asChild className="mt-5"><Link href="/protected">Back to dashboard</Link></Button></section>;
  }
  const season = params.season ? seasons.find((s) => s.id === params.season) : seasons.find((s) => s.status === "active");
  if (!season) notFound();
  const kind = params.kind === "team" ? "team" : "player";
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.page ?? "1", 10) || 1));
  const archived = season.status === "closed";
  const base = `/protected/seasons?season=${season.id}&kind=${kind}`;
  // Paginate at the database boundary; archived history remains reachable beyond 1,000 rows.
  const standings: Standing[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.rpc("season_leaderboard", { p_season: season.id, p_kind: kind }).order("rank").range(offset, offset + 999);
    if (result.error) throw new Error(result.error.message);
    const batch = (result.data ?? []) as Standing[];
    standings.push(...batch);
    if (batch.length < 1000) break;
  }
  const resultQuery = archived
    ? supabase.from("season_history").select("payload", { count: "exact" }).eq("season_id", season.id).eq("kind", kind === "team" ? "doubles" : "singles").order("payload->>created_at", { ascending: false }).order("record_id")
    : supabase.from(kind === "team" ? "doubles_matches" : "matches").select("*", { count: "exact" }).eq("season_id", season.id).order("created_at", { ascending: false }).order("id");
  const [results, organizer, pendingSingles, pendingDoubles, expired] = await Promise.all([
    resultQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.rpc("is_season_organizer"),
    supabase.from("match_reports").select("id", { count: "exact", head: true }).eq("season_id", season.id).eq("status", "pending"),
    supabase.from("doubles_match_reports").select("id", { count: "exact", head: true }).eq("season_id", season.id).eq("status", "pending"),
    supabase.from("season_history").select("payload").eq("season_id", season.id).eq("kind", kind === "team" ? "doubles_report" : "singles_report").eq("payload->>status", "expired").order("record_id").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);
  if (results.error || organizer.error || expired.error) throw new Error(results.error?.message ?? organizer.error?.message ?? expired.error?.message);
  const matches = (results.data ?? []).map((row) => (archived ? row.payload : row) as Result);
  const names = new Map(standings.map((row) => [row.entity_id, row.snapshot.name || row.snapshot.display_name || row.snapshot.email || "Player"]));
  const championId = kind === "team" ? season.champion_team_id : season.champion_id;
  const leader = archived ? standings.find((row) => row.entity_id === championId) : standings.find((row) => row.snapshot.wins > 0);
  const endReached = Date.now() >= Date.parse(season.ends_at);
  const progress = seasonProgress(season);
  const resultDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  const matchTitle = (m: Result) => `${names.get(m.player_one_id ?? m.team_one_id ?? "") ?? "Player"} vs ${names.get(m.player_two_id ?? m.team_two_id ?? "") ?? "Player"}`;
  return <div className="season-page space-y-6">
    <header className="season-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-9">
      <div aria-hidden="true" className="season-orbit" /><div aria-hidden="true" className="season-orbit season-orbit-two" />
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">{archived ? <Archive className="size-3.5" /> : <Leaf className="size-3.5" />}{archived ? "Sealed in the history books" : endReached ? "Season complete · awaiting rollover" : "A fresh rally starts here"}</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{season.name}</h1>
          <p className="mt-3 text-sm text-white/80">{seasonDate(season.starts_at)} – {seasonDate(new Date(Date.parse(season.ends_at)-1).toISOString())} · Toronto time</p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/80">{archived ? "Every rally remembered. Final ratings, team records, and the players who made this season." : "New season. Same rivals. Build your record, find your partner, and make a run for the top."}</p>
        </div>
        <SeasonSelector seasons={seasons} selectedId={season.id} kind={kind} />
      </div>
      <div className="relative mt-7"><div className="mb-2 flex justify-between text-xs text-white/75"><span>{archived ? "Final standings preserved" : "Season progress"}</span><span>{Math.round(progress)}%</span></div><div role="progressbar" aria-label="Season progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-1.5 overflow-hidden rounded-full bg-white/20"><div className="season-progress h-full rounded-full bg-amber-300" style={{ width: `${progress}%` }} /></div></div>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="season-panel p-5"><p className="season-eyebrow">{archived ? "Season champion" : "Leading the chase"}</p><div className="mt-3 flex items-center gap-3"><Crown className="size-7 shrink-0 text-amber-600 dark:text-amber-300" /><p className="break-words text-xl font-semibold">{leader ? names.get(leader.entity_id) : archived ? "No champion awarded" : "Your story starts now"}</p></div><p className="mt-2 text-xs text-muted-foreground">{leader ? `${leader.snapshot.rating.toLocaleString()} rating · ${leader.snapshot.wins} wins` : "A win is required to qualify."}</p></div>
      <div className="season-panel p-5"><p className="season-eyebrow">{kind === "team" ? "Teams on the court" : "Players on the court"}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{standings.length}</p><p className="mt-2 text-xs text-muted-foreground">{archived ? "Saved at the season close" : "Everyone starts at 1,000"}</p></div>
      <div className="season-panel p-5"><p className="season-eyebrow">Confirmed {kind === "team" ? "doubles" : "singles"} matches</p><p className="mt-3 text-3xl font-semibold tabular-nums">{results.count ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Lifetime achievements carry forward</p></div>
    </div>

    <section className="season-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:px-7"><div><h2 className="text-xl font-semibold">{archived ? "Final standings" : "The season table"}</h2><p className="mt-1 text-xs text-muted-foreground">Rating, then wins, fewer losses, join date, and player ID. Player ratings include singles and doubles.</p></div>
        <nav aria-label="Standings type" className="flex rounded-xl bg-muted p-1">{(["player", "team"] as const).map((tab) => <Link key={tab} aria-current={kind === tab ? "page" : undefined} href={`/protected/seasons?season=${season.id}&kind=${tab}`} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${kind === tab ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{tab === "player" ? <Trophy className="size-4" /> : <Users className="size-4" />}{tab === "player" ? "Players" : "Doubles"}</Link>)}</nav></div>
      <div className="max-h-[640px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-muted-foreground"><tr><th scope="col" className="px-4 py-3 sm:px-7">Rank</th><th scope="col" className="px-2 py-3">{kind === "team" ? "Team" : "Player"}</th><th scope="col" className="px-2 py-3 text-right">W–L</th><th scope="col" className="px-4 py-3 text-right sm:px-7">Rating</th></tr></thead><tbody>
        {standings.map(({ entity_id, rank, snapshot: p }) => <tr key={entity_id} className={`season-standing border-t transition-colors hover:bg-primary/5 ${entity_id === championId ? "bg-amber-500/10" : entity_id === user.id ? "bg-primary/5" : ""}`}><td className="px-4 py-4 font-medium tabular-nums sm:px-7">{entity_id === championId ? <Crown aria-label="Champion" className="size-5 text-amber-600" /> : `#${rank}`}</td><td className="max-w-44 px-2 py-4"><span className="block break-words font-semibold">{names.get(entity_id)} {entity_id === user.id && <span className="text-xs text-primary">You</span>}</span>{kind === "team" && <span className="text-xs text-muted-foreground">{p.player_one_name} + {p.player_two_name}</span>}</td><td className="whitespace-nowrap px-2 py-4 text-right tabular-nums text-muted-foreground">{p.wins}–{p.losses}</td><td className="px-4 py-4 text-right text-lg font-semibold tabular-nums sm:px-7">{p.rating.toLocaleString()}</td></tr>)}
      </tbody></table>{!standings.length && <p className="p-8 text-center text-sm text-muted-foreground">The court is ready. No {kind === "team" ? "teams" : "players"} yet.</p>}</div>
    </section>

    <section className="season-panel p-5 sm:p-7"><div className="flex items-center gap-2"><Archive className="size-5 text-primary" /><h2 className="text-xl font-semibold">The match book</h2></div><p className="mt-2 text-sm text-muted-foreground">{archived ? "Original scores and rating changes, preserved exactly as recorded." : "Confirmed results from this season."}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{matches.map((m) => <article key={m.id} className="rounded-xl border bg-background/60 p-4"><div className="flex justify-between gap-3"><h3 className="break-words font-medium">{matchTitle(m)}</h3><span className="shrink-0 text-sm font-semibold text-primary">+{m.rating_delta ?? m.team_rating_delta ?? 0}</span></div><p className="mt-2 break-words text-lg font-semibold tabular-nums">{m.score_summary || `${m.player_one_score ?? m.team_one_score ?? 0}–${m.player_two_score ?? m.team_two_score ?? 0}`}</p><p className="mt-2 text-xs text-muted-foreground">Winner: {names.get(m.winner_id ?? m.winner_team_id ?? "") ?? "Player"} · {resultDate(m.created_at)}</p></article>)}</div>
      {!matches.length && <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{archived ? "No confirmed matches on this page." : "The first result is still to come. See you at the table."}</p>}
      <div className="mt-5 flex items-center justify-between"><Button asChild variant="outline" disabled={page <= 1}><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={page <= 1 ? "pointer-events-none opacity-40" : ""} href={`${base}&page=${Math.max(1,page-1)}`}><ArrowLeft /> Previous</Link></Button><span className="text-xs text-muted-foreground">Page {page}</span><Button asChild variant="outline" disabled={page*PAGE_SIZE >= (results.count ?? 0) && (expired.data?.length ?? 0) < PAGE_SIZE}><Link aria-disabled={page*PAGE_SIZE >= (results.count ?? 0) && (expired.data?.length ?? 0) < PAGE_SIZE} tabIndex={page*PAGE_SIZE >= (results.count ?? 0) && (expired.data?.length ?? 0) < PAGE_SIZE ? -1 : undefined} className={page*PAGE_SIZE >= (results.count ?? 0) && (expired.data?.length ?? 0) < PAGE_SIZE ? "pointer-events-none opacity-40" : ""} href={`${base}&page=${page+1}`}>Next <ArrowRight /></Link></Button></div>
      {!!expired.data?.length && <details className="mt-6 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Unconfirmed reports preserved on this page</summary><p className="mt-2 text-xs text-muted-foreground">Visible to the participants and season organizers. These reports expired at the boundary and never changed ratings.</p><ul className="mt-3 space-y-2">{expired.data.map(({ payload }) => { const m = payload as Result; return <li key={m.id} className="text-sm">{matchTitle(m)} · {m.score_summary || `${m.player_one_score ?? m.team_one_score ?? 0}–${m.player_two_score ?? m.team_two_score ?? 0}`} <span className="text-muted-foreground">· Expired</span></li>; })}</ul></details>}
      {season.name === "Summer 2026" && <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">The first archive includes all results recorded before the season migration, including September 8 results. Original timestamps and rating changes are retained; those matches were not replayed into Autumn.</p>}
    </section>
    {!archived && organizer.data === true && <SeasonOrganizer season={season} pendingCount={(pendingSingles.count ?? 0)+(pendingDoubles.count ?? 0)} canClose={endReached} />}
  </div>;
}
