"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type DeliveryCollectionProgressRingProps = {
  collected: number;
  remaining: number;
  percent: number;
  fleetAmount: number;
  className?: string;
};

export function DeliveryCollectionProgressRing({
  collected,
  remaining,
  percent,
  fleetAmount,
  className,
}: DeliveryCollectionProgressRingProps) {
  const size = 46;
  const stroke = 4.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const complete = fleetAmount > 0 && remaining <= 0.01;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-3 min-w-[168px]", className)}>
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  className="stroke-muted/50"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className={cn(
                    "transition-[stroke-dashoffset] duration-500",
                    complete ? "stroke-emerald-500" : "stroke-primary"
                  )}
                />
              </svg>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums",
                  complete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}
              >
                {Math.round(clamped)}%
              </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] text-muted-foreground leading-tight">Collected</span>
              <span className="text-xs font-medium tabular-nums text-foreground truncate">
                {formatNaira(collected)}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Remaining{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatNaira(remaining)}
                </span>
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium">Station retail vs fleet sale</p>
          <p className="text-muted-foreground mt-1">
            Fleet amount: {formatNaira(fleetAmount)} · Retail allocated (FIFO):{" "}
            {formatNaira(collected)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
