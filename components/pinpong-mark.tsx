import { cn } from "@/lib/utils";

export function PinPongMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span
        className={cn(
          "absolute left-[0.55rem] top-[0.45rem] h-5 w-[1.125rem] origin-[70%_85%] -rotate-12 rounded-full bg-primary-foreground shadow-[inset_-0.25rem_-0.18rem_0_hsl(var(--accent)/0.55)]",
          animated && "animate-ping-pong-swing",
        )}
      />
      <span
        className={cn(
          "absolute bottom-[0.42rem] right-[0.46rem] h-4 w-1.5 origin-top rotate-45 rounded-full bg-secondary shadow-sm",
          animated && "animate-ping-pong-handle",
        )}
      />
      <span
        className={cn(
          "absolute left-[1.33rem] top-[0.65rem] size-2.5 rounded-full bg-chart-4 shadow-[0_0_12px_hsl(var(--chart-4)/0.85)]",
          animated && "animate-ping-pong-ball",
        )}
      />
    </span>
  );
}
