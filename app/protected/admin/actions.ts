"use server";
import { revalidatePath } from "next/cache";
import { isAppAdmin } from "@/lib/admin-server";
import { createClient } from "@/lib/supabase/server";

export async function updateSeasonName(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  if (!await isAppAdmin()) return { error: "Administrator access required." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_active_season", { p_season: String(formData.get("season_id") ?? ""), p_name: String(formData.get("name") ?? "").trim() });
  if (error) return { error: error.message };
  revalidatePath("/protected", "layout");
  return { success: "Season name updated." };
}

export async function moderateContent(formData: FormData) {
  if (!await isAppAdmin()) throw new Error("Administrator access required.");
  if (formData.get("confirm") !== "on") throw new Error("Confirm the removal first.");
  const supabase = await createClient();
  const table = formData.get("kind") === "comment" ? "post_comments" : "posts";
  const { error } = await supabase.from(table).delete().eq("id", String(formData.get("id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath("/protected", "layout");
}
