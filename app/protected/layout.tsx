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
    <main className="court-stripes flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center gap-5 sm:gap-8">
        <nav className="sticky top-0 z-40 flex min-h-16 w-full justify-center border-b border-b-primary/15 bg-background/90 shadow-sm shadow-primary/5 backdrop-blur-lg">
          <div className="flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 text-sm sm:px-5">
            <div className="flex min-w-0 items-center gap-2 font-semibold sm:gap-4">
              <Link href={"/"} className="flex min-w-0 items-center gap-2">
                <PinPongMark animated className="size-8" />
                <span className="hidden truncate min-[390px]:inline">
                  Chartwell Ping Pong
                </span>
                <span className="truncate min-[390px]:hidden">PinPong</span>
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
        <div className="flex w-full max-w-6xl flex-1 flex-col px-3 py-2 sm:px-5 sm:py-4">
          {children}
        </div>

        <footer className="mx-auto flex w-full items-center justify-center gap-8 border-t border-t-primary/15 py-6 text-center text-xs sm:py-8">
          <p>Chartwell Ping Pong</p>
        </footer>
      </div>
    </main>
  );
}
