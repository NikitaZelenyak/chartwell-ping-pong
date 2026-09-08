import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShieldCheck, Settings2, Trophy, MessageSquare } from "lucide-react";
import { isAppAdmin } from "@/lib/admin-server";
import { getSeasons } from "@/lib/seasons-server";
import { createClient } from "@/lib/supabase/server";
import { seasonDate } from "@/lib/seasons";
import { SeasonOrganizer } from "@/components/season-organizer";
import { AdminSeasonSettings } from "@/components/admin-season-settings";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { PingPongLoader } from "@/components/ping-pong-loader";
import { moderateContent } from "./actions";

export default function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return <Suspense fallback={<PingPongLoader label="Opening your admin desk…" />}><AdminContent searchParams={searchParams} /></Suspense>;
}
async function AdminContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!await isAppAdmin()) notFound();
  const params = await searchParams;
  const page = Math.max(1,Number.parseInt(params.page ?? "1",10)||1);
  const seasons = await getSeasons();
  const active = seasons.find(s => s.status === "active");
  const supabase = await createClient();
  const [singles,doubles,posts,comments] = await Promise.all([
    supabase.from("match_reports").select("id",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("doubles_match_reports").select("id",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("posts").select("id,body,created_at",{count:"exact"}).order("created_at",{ascending:false}).order("id").range((page-1)*10,page*10-1),
    supabase.from("post_comments").select("id,post_id,body,created_at",{count:"exact"}).order("created_at",{ascending:false}).order("id").range((page-1)*10,page*10-1),
  ]);
  for (const result of [singles,doubles,posts,comments]) if (result.error) throw new Error(result.error.message);
  return <div className="season-page space-y-6">
    <header className="season-hero rounded-3xl p-6 text-white sm:p-9"><ShieldCheck className="size-8 text-amber-200" /><p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-white/70">Your private control room</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin desk</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Season setup, league management, and community moderation. Access is restricted to your account: zeleniak.nikita@gmail.com.</p></header>
    <div className="grid gap-5 md:grid-cols-2"><section className="season-panel p-6"><h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><Settings2 className="size-5 text-primary" /> Season setup</h2>{active && <AdminSeasonSettings season={active} />}</section><section className="season-panel p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><Trophy className="size-5 text-primary" /> League management</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Manage any tournament and its bracket. Completed results stay attached to their original season. Ratings can only change through the match workflow.</p><Button asChild className="mt-5"><Link href="/protected/tournaments">Manage tournaments</Link></Button><div className="mt-6 border-t pt-4 text-sm"><strong>{(singles.count ?? 0)+(doubles.count ?? 0)}</strong> pending match confirmations across the league.</div></section></div>
    {active && <SeasonOrganizer key={active.id} season={active} pendingCount={(singles.count ?? 0)+(doubles.count ?? 0)} canClose={Date.now() >= Date.parse(active.ends_at)} />}
    <section className="season-panel p-6"><h2 className="text-xl font-semibold">Season ledger</h2><div className="mt-4 divide-y">{seasons.map(s => <Link key={s.id} href={`/protected/seasons?season=${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm hover:text-primary"><strong>{s.name}</strong><span className="text-muted-foreground">{s.status === "closed" ? `Archived ${seasonDate(s.closed_at!)}` : `Closes ${seasonDate(s.ends_at)}`} →</span></Link>)}</div></section>
    <section className="season-panel p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><MessageSquare className="size-5 text-primary" /> Community moderation</h2><p className="mt-2 text-sm text-muted-foreground">Review posts and comments. Removing a post also removes its comments and reactions.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{[...(posts.data ?? []).map(p=>({...p,kind:"post",post_id:p.id})),...(comments.data ?? []).map(c=>({...c,kind:"comment"}))].map(item=><article key={item.id} className="rounded-xl border p-4"><Link className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline" href={`/protected/posts/${item.post_id}`}>Open {item.kind}</Link><p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm">{item.body || "Video post"}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-destructive">Remove {item.kind}</summary><form action={moderateContent} className="mt-3 grid gap-3"><input name="id" type="hidden" value={item.id} /><input name="kind" type="hidden" value={item.kind} /><label className="flex items-start gap-2 text-xs"><input name="confirm" type="checkbox" required />I understand this permanently removes the {item.kind}.</label><SubmitButton variant="destructive" pendingLabel="Removing…">Remove {item.kind}</SubmitButton></form></details></article>)}</div><div className="mt-5 flex gap-4 text-sm">{page>1 && <Link href={`/protected/admin?page=${page-1}`} className="text-primary">← Previous</Link>}{Math.max(posts.count ?? 0,comments.count ?? 0)>page*10 && <Link href={`/protected/admin?page=${page+1}`} className="text-primary">Next →</Link>}</div></section>
  </div>;
}
