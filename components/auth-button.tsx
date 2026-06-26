import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;
  const userId = typeof user?.sub === "string" ? user.sub : null;
  const fallbackName = typeof user?.email === "string" ? user.email : "Player";
  let displayName = fallbackName;

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    displayName = profile?.display_name?.trim() || fallbackName;
  }

  return user ? (
    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
      <span className="hidden max-w-52 truncate sm:inline">{displayName}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
