"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function closeSeason(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to manage seasons." };
  if (formData.get("acknowledge") !== "on") return { error: "Review and acknowledge the season reset first." };
  const { error } = await supabase.rpc("start_next_season", {
    p_expected_season: String(formData.get("season_id") ?? ""),
    p_name: String(formData.get("name") ?? "").trim(),
  });
  if (error) return { error: error.message };
  revalidatePath("/protected", "layout");
  return { success: "Season archived. The next season is open with fresh ratings and records." };
}
