"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createNavigationTimer, isPageNavigation } from "@/lib/arcade";
export function beginNavigation(href: string) {
  if (isPageNavigation(href, window.location.href)) window.dispatchEvent(new Event("pinpong:navigate"));
  else endNavigation();
}
export function endNavigation() { window.dispatchEvent(new Event("pinpong:navigated")); }
export function NavigationFeedback() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const timer = useMemo(() => createNavigationTimer(setVisible), []);
  useEffect(() => { timer.stop(); }, [pathname, search, timer]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") timer.stop(); };
    window.addEventListener("pinpong:navigate", timer.start);
    window.addEventListener("pinpong:navigated", timer.stop);
    window.addEventListener("popstate", timer.stop);
    window.addEventListener("pagehide", timer.stop);
    window.addEventListener("error", timer.stop);
    window.addEventListener("unhandledrejection", timer.stop);
    window.addEventListener("keydown", key);
    return () => {
      timer.stop();
      window.removeEventListener("pinpong:navigate", timer.start); window.removeEventListener("pinpong:navigated", timer.stop);
      window.removeEventListener("popstate", timer.stop); window.removeEventListener("pagehide", timer.stop);
      window.removeEventListener("error", timer.stop); window.removeEventListener("unhandledrejection", timer.stop); window.removeEventListener("keydown", key);
    };
  }, [timer]);
  return visible ? <div role="status" aria-live="polite" className="navigation-court"><span className="navigation-ball"/><span className="sr-only">Loading page…</span></div> : null;
}
