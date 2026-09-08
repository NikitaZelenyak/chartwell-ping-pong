"use client";
import { RallyIndicator } from "@/components/rally-court";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      window.location.assign("/auth/login");
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-11 px-0 sm:w-36"
      aria-busy={isLoading}
      aria-label={isLoading ? "Logging out" : "Log out"}
      disabled={isLoading}
      onClick={logout}
      size="sm"
      variant="outline"
    >
      {isLoading ? (
        <RallyIndicator />
      ) : (
        <LogOut />
      )}
      <span className="hidden sm:inline">
        {isLoading ? "Logging out…" : "Logout"}
      </span>
    </Button>
  );
}
