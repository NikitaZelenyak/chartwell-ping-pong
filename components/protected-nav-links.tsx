"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const links = [
  { href: "/protected", label: "Dashboard", exact: true },
  { href: "/protected/profile", label: "Profile" },
  { href: "/protected/doubles", label: "Doubles" },
  { href: "/protected/tournaments", label: "Tournaments" },
  { href: "/protected/guide", label: "How it works" },
];

export function ProtectedNavLinks() {
  const pathname = usePathname();
  const activeLink = links.find((link) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href),
  );

  return (
    <>
      <div className="hidden items-center gap-1 text-xs font-medium text-muted-foreground sm:flex">
        {links.map((link) => (
          <NavLink href={link.href} key={link.href} label={link.label} pathname={pathname} exact={link.exact} />
        ))}
      </div>

      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Open navigation"
              className="h-10 gap-2 border-primary/20 bg-background/80 px-3 shadow-sm"
              size="sm"
              variant="outline"
            >
              <Menu className="size-4" />
              <span className="max-w-20 truncate text-xs">
                {activeLink?.label ?? "Menu"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-2">
            <div className="grid gap-1">
              {links.map((link) => (
                <NavLink
                  exact={link.exact}
                  href={link.href}
                  key={link.href}
                  label={link.label}
                  pathname={pathname}
                  mobile
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function NavLink({
  exact,
  href,
  label,
  mobile = false,
  pathname,
}: {
  exact?: boolean;
  href: string;
  label: string;
  mobile?: boolean;
  pathname: string;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      className={cn(
        "rounded-md transition hover:bg-primary/10 hover:text-foreground",
        mobile
          ? "px-3 py-2 text-sm font-medium text-muted-foreground"
          : "px-2.5 py-1.5",
        active && "bg-primary/10 text-primary shadow-sm",
      )}
      href={href}
    >
      {label}
    </Link>
  );
}
