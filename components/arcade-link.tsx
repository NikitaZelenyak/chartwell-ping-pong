"use client";
import NextLink from "next/link";
import { forwardRef, useRef, type ComponentProps } from "react";
import { beginNavigation, endNavigation } from "@/components/navigation-feedback";
/** Next only calls onNavigate for accepted client navigation (not downloads or modified clicks). */
const ArcadeLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function ArcadeLink({ onNavigate, ...props }, forwardedRef) {
  const anchor = useRef<HTMLAnchorElement | null>(null);
  return <NextLink {...props} ref={element => {
    anchor.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault() { cancelled = true; event.preventDefault(); } });
    if (cancelled) endNavigation();
    else if (anchor.current) beginNavigation(anchor.current.href);
  }} />;
});
export default ArcadeLink;
