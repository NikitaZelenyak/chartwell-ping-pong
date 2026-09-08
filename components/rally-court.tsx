"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
export function RallyCourt({ className, compact = false }: { className?: string; compact?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { element.dataset.paused = String(!entry.isIntersecting); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} aria-hidden="true" className={cn("rally-scene", compact && "rally-compact", className)}>
    <svg viewBox="0 0 320 180" fill="none" className="rally-art">
      <rect x="30" y="24" width="260" height="132" rx="8" className="rally-table" />
      <path d="M42 36H278V144H42Z M42 90H278" className="rally-lines" />
      <path d="M160 20V160" className="rally-net" />
      <g className="rally-paddle rally-left"><rect x="33" y="100" width="9" height="27" rx="4" fill="#d5aa79"/><ellipse cx="38" cy="89" rx="16" ry="23" fill="currentColor"/><path d="M29 76L43 99" stroke="white" strokeOpacity=".4" strokeWidth="2"/></g>
      <g className="rally-paddle rally-right"><rect x="278" y="53" width="9" height="27" rx="4" fill="#d5aa79"/><ellipse cx="282" cy="90" rx="16" ry="23" fill="#b8ed52"/><path d="M275 78L287 99" stroke="#19332b" strokeOpacity=".4" strokeWidth="2"/></g>
      <path d="M63 76L70 70M64 89H74M63 102L70 108" className="rally-impact rally-impact-left" />
      <path d="M257 76L250 70M256 89H246M257 102L250 108" className="rally-impact rally-impact-right" />
      <g className="rally-ball"><circle cx="61" cy="90" r="7" fill="#ff944d"/><circle cx="59" cy="88" r="2" fill="#ffe2c8"/></g>
    </svg>
  </span>;
}
export function RallyIndicator({ className }: { className?: string }) {
  return <RallyCourt compact className={className} />;
}
