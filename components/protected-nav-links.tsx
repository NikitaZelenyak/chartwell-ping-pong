"use client";

import {
  BookOpen,
  Leaf,
  ShieldCheck,
  ChevronRight,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Swords,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PinPongMark } from "@/components/pinpong-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/protected/seasons", label: "Seasons", description: "Standings, champions, and every past rally", icon: Leaf },
  {
    href: "/protected",
    label: "Dashboard",
    description: "Ratings, results, and activity",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/protected/profile",
    label: "Profile",
    description: "Your player card and achievements",
    icon: UserRound,
  },
  {
    href: "/protected/posts",
    label: "Posts",
    description: "Videos, thoughts, and discussion",
    icon: MessagesSquare,
  },
  {
    href: "/protected/doubles",
    label: "Doubles",
    description: "Teams, invites, and match reports",
    icon: Swords,
  },
  {
    href: "/protected/tournaments",
    label: "Tournaments",
    description: "Join or organize a bracket",
    icon: Trophy,
  },
  {
    href: "/protected/guide",
    label: "How it works",
    description: "A quick guide to the league",
    icon: BookOpen,
  },
];

export function ProtectedNavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const navigationLinks = isAdmin ? [...links, { href: "/protected/admin", label: "Admin", description: "Your private league controls", icon: ShieldCheck, exact: false }] : links;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div className="hidden items-center gap-1 text-xs font-medium text-muted-foreground xl:flex">
        {navigationLinks.map((link) => (
          <NavLink
            href={link.href}
            key={link.href}
            label={link.label}
            pathname={pathname}
            exact={link.exact}
          />
        ))}
      </div>

      <div className="xl:hidden">
        <Button
          aria-controls="mobile-navigation"
          aria-expanded={open}
          aria-label="Open navigation menu"
          className="border-primary/20 bg-background/80 shadow-sm"
          onClick={() => setOpen(true)}
          size="icon"
          type="button"
          variant="outline"
        >
          <Menu />
        </Button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            aria-modal="true"
            className="animate-mobile-menu-in absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-primary/20 bg-background p-3 shadow-2xl shadow-foreground/20"
            id="mobile-navigation"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 border-b border-primary/15 px-1 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <PinPongMark animated className="size-9" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">Chartwell Ping Pong</p>
                  <p className="text-xs text-muted-foreground">Player menu</p>
                </div>
              </div>
              <Button
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <nav aria-label="Player navigation" className="mt-3 grid gap-1.5">
              {navigationLinks.map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-16 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors",
                      active
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "text-foreground hover:border-primary/15 hover:bg-primary/5",
                    )}
                    href={link.href}
                    key={link.href}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground",
                        active && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{link.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavLink({
  exact,
  href,
  label,
  pathname,
}: {
  exact?: boolean;
  href: string;
  label: string;
  pathname: string;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 transition hover:bg-primary/10 hover:text-foreground",
        active && "bg-primary/10 text-primary shadow-sm",
      )}
      href={href}
    >
      {label}
    </Link>
  );
}
