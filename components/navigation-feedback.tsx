"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const isSamePage =
        url.pathname === current.pathname && url.search === current.search;

      if (url.origin !== current.origin || isSamePage) {
        return;
      }

      setIsNavigating(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsNavigating(false), 10000);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimeout(timeout);
    };
  }, []);

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      aria-label="Loading page"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15"
      role="status"
    >
      <div className="h-full w-1/2 animate-navigation-progress rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.65)]" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
