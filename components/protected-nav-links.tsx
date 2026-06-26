"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/protected", label: "Dashboard", exact: true },
  { href: "/protected/profile", label: "Profile" },
  { href: "/protected/invites", label: "Invites" },
  { href: "/protected/tournaments", label: "Tournaments" },
  { href: "/protected/guide", label: "How it works" },
];

export function ProtectedNavLinks() {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-1 text-xs font-medium text-muted-foreground sm:flex">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            className={cn(
              "rounded-md px-2.5 py-1.5 transition hover:bg-primary/10 hover:text-foreground",
              active && "bg-primary/10 text-primary shadow-sm",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
