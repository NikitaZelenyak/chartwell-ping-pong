"use client";
import { useActionState } from "react";
import { updateSeasonName } from "@/app/protected/admin/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Season } from "@/lib/seasons";

export function AdminSeasonSettings({ season }: { season: Season }) {
  const [state, action, pending] = useActionState(updateSeasonName, {});
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="season_id" value={season.id} />
    <label className="grid gap-2 text-sm font-medium">Current season name<Input name="name" defaultValue={season.name} key={season.name} required maxLength={80} /></label>
    <p className="text-sm leading-6 text-muted-foreground">Seasons last three calendar months in America/Toronto. Dates stay fixed so editing a label cannot move matches or trigger a reset.</p>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-primary">{state.success}</p>}
    <Button type="submit" disabled={pending} className="justify-self-start">{pending ? "Saving…" : "Save season name"}</Button>
  </form>;
}
