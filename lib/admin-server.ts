import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const isAppAdmin = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_app_admin");
  return !error && data === true;
});
