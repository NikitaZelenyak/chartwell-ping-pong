"use client";

import { useActionState, useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { closeSeason } from "@/app/protected/seasons/actions";
import { nextSeasonName, seasonDate, type Season } from "@/lib/seasons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SeasonOrganizer({ season, pendingCount, canClose }: { season: Season; pendingCount: number; canClose: boolean }) {
  const [review, setReview] = useState(false);
  const [state, action, pending] = useActionState(closeSeason, {});
  return <section className="season-panel border-primary/25 p-5 sm:p-7">
    <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary" /> Organizer desk</div>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Scheduled close: {seasonDate(season.ends_at)}, 12:00 a.m. America/Toronto. {pendingCount} unconfirmed reports will expire. Completed scores, final standings, and lifetime achievements stay saved.</p>
    {state.error && <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p>}
    {state.success && <p role="status" className="mt-3 text-sm text-primary">{state.success}</p>}
    {!review ? <Button type="button" variant="outline" className="mt-4" onClick={() => setReview(true)}>Review next season <ArrowRight /></Button> :
      <form action={action} className="mt-5 grid max-w-xl gap-4">
        <input name="season_id" type="hidden" value={season.id} />
        <label className="grid gap-2 text-sm font-medium">Next season name<Input name="name" required maxLength={80} defaultValue={nextSeasonName(season)} /></label>
        <div className="rounded-xl bg-muted/70 p-4 text-sm leading-6">Close <strong>{season.name}</strong>, freeze the final player and team tables, then start a three-month season. Every player and team begins at <strong>1,000 rating · 0 wins · 0 losses</strong>. Pending reports cannot carry over. Existing tournaments stay with their original season.</div>
        <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="acknowledge" required className="mt-1 size-4 accent-emerald-700" />I reviewed the reset and understand that the archived season cannot be reopened here.</label>
        {!canClose && <p className="text-sm text-muted-foreground">Rollover becomes available at the scheduled close.</p>}
        <Button disabled={pending || !canClose} type="submit">{pending ? "Archiving season…" : "Close season & start next"}</Button>
      </form>}
  </section>;
}
