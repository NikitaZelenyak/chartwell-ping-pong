import { cn } from "@/lib/utils";
import { RallyCourt } from "@/components/rally-court";
export function PingPongLoader({ label, className, variant = "section" }: {
  label: string; className?: string; variant?: "page" | "section" | "inline";
}) {
  return <div role="status" aria-live="polite" className={cn("rally-loader", variant === "inline" ? "inline-flex items-center gap-2" : "season-panel grid place-items-center px-4 py-10 text-center", variant === "page" ? "min-h-[65vh]" : variant === "section" ? "min-h-64" : "", className)}>
    <div className={cn(variant === "inline" ? "flex items-center gap-2" : "grid justify-items-center gap-4")}>
      <RallyCourt compact={variant === "inline"} className={variant !== "inline" ? "w-52 max-w-full" : undefined} />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  </div>;
}
export function ScoreboardSkeleton({ kind = "standings", label = "Loading the scoreboard…" }: { kind?: "standings" | "profile" | "posts"; label?: string }) {
  return <section role="status" aria-live="polite" className="season-panel space-y-6 p-5 sm:p-7">
    <div className="flex items-center gap-3"><RallyCourt compact /><span className="text-sm text-muted-foreground">{label}</span></div>
    <div aria-hidden="true" className="space-y-4">
      <div className="skeleton-block h-8 w-2/5" />
      {kind === "profile" && <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="skeleton-block h-28" />)}</div>}
      {Array.from({length: kind === "posts" ? 3 : 6}, (_, i) => <div key={i} className="flex items-center gap-4 border-t pt-4"><div className="skeleton-block size-11 shrink-0 rounded-full"/><div className="flex-1 space-y-3"><div className="skeleton-block h-4 w-2/5"/><div className={cn("skeleton-block w-4/5", kind === "posts" ? "h-20" : "h-3")} /></div>{kind === "standings" && <div className="skeleton-block h-7 w-16"/>}</div>)}
    </div>
  </section>;
}
