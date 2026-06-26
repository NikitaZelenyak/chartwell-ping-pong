import { batBall } from "@lucide/lab";
import { Icon } from "lucide-react";

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
        "relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[linear-gradient(145deg,#10b981,#059669_55%,#0891b2)] text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_72%_26%,rgba(250,204,21,0.45),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.2),transparent_48%)]" />
      <Icon
        iconNode={batBall}
        className={cn(
          "relative size-6 stroke-[2.35] drop-shadow-[0_2px_2px_rgba(5,60,50,0.32)]",
          animated && "transition-transform duration-300",
        )}
      />
    </span>
  );
}
