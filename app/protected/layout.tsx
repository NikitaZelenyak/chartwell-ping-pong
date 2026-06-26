import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { PinPongMark } from "@/components/pinpong-mark";
import { ProtectedNavLinks } from "@/components/protected-nav-links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="court-stripes min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center sm:gap-10">
        <nav className="w-full flex min-h-16 justify-center border-b border-b-primary/15 bg-background/85 backdrop-blur">
          <div className="w-full max-w-6xl flex justify-between items-center gap-3 p-3 px-4 text-sm sm:px-5">
            <div className="flex min-w-0 gap-5 items-center font-semibold">
              <Link href={"/"} className="flex min-w-0 items-center gap-2">
                <PinPongMark animated className="size-8" />
                <span className="truncate">Chartwell Ping Pong</span>
              </Link>
              <Suspense fallback={null}>
                <ProtectedNavLinks />
              </Suspense>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeSwitcher />
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </nav>
        <div className="flex-1 flex w-full max-w-6xl flex-col px-4 py-2 sm:p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t border-t-primary/15 mx-auto text-center text-xs gap-8 py-6 sm:py-8">
          <p>Chartwell Ping Pong</p>
        </footer>
      </div>
    </main>
  );
}
