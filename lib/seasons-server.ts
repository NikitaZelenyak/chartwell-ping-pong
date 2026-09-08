import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/lib/seasons";

export const getSeasons = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select("*").order("starts_at", { ascending: false });
  if (error) throw new Error(`Seasons are unavailable: ${error.message}`);
  return (data ?? []) as Season[];
});

export async function getActiveSeason() {
  return (await getSeasons()).find((season) => season.status === "active") ?? null;
}
