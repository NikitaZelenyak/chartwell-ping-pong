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
        "relative inline-grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="absolute left-2 top-2 size-4 rounded-full bg-chart-4 shadow-[0_0_12px_hsl(var(--chart-4)/0.85)]" />
      <span className="absolute bottom-2 right-2 h-4 w-2.5 rotate-45 rounded-full bg-primary-foreground" />
      <span className="absolute bottom-1.5 right-1.5 h-3 w-1 rotate-45 rounded-full bg-primary-foreground" />
      <span
        className={cn(
          "absolute left-5 top-2 size-1.5 rounded-full bg-background",
          animated && "animate-pinpong-ball",
        )}
      />
    </span>
  );
}
