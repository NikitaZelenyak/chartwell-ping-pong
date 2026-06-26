import { cn } from "@/lib/utils";

export function PingPongLoader({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[24rem] place-items-center rounded-md border border-dashed px-4 text-center sm:min-h-[40rem]",
        className,
      )}
    >
      <div className="grid place-items-center gap-3">
        <div className="relative h-16 w-24">
          <div className="absolute bottom-2 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-primary/20" />
          <div className="absolute bottom-3 left-1/2 h-9 w-5 -translate-x-1/2 rotate-45 rounded-full bg-primary shadow-sm" />
          <div className="absolute bottom-1 left-[58%] h-5 w-1.5 rotate-45 rounded-full bg-secondary shadow-sm" />
          <div className="animate-loader-ball absolute left-1/2 top-1 size-5 -translate-x-1/2 rounded-full bg-chart-4 shadow-[0_0_16px_hsl(var(--chart-4)/0.75)]" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
