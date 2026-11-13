import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRODUCT_ORDER = ["PMS", "AGO", "DPK", "LPG"] as const;

export type RemainingByProduct = Partial<Record<(typeof PRODUCT_ORDER)[number], number>>;

/** Working-stock bands used across retail fuel sites. */
export function remainingStockTone(volume: number, capacity: number) {
  if (volume <= 0) {
    return {
      label: "Critical",
      hint: "No sellable stock on hand",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
      Icon: CircleAlert,
    };
  }

  const fill = capacity > 0 ? volume / capacity : 1;
  if (capacity > 0 && fill < 0.15) {
    return {
      label: "Critical",
      hint: "Below 15% of working capacity — run-out risk",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
      Icon: CircleAlert,
    };
  }
  if (capacity > 0 && fill < 0.4) {
    return {
      label: "Low",
      hint: "Below 40% of working capacity — reorder",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
      Icon: AlertTriangle,
    };
  }
  return {
    label: "Adequate",
    hint: capacity > 0 ? "Within normal operating range" : "Stock on hand",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    Icon: CheckCircle2,
  };
}

function formatLiters(value: number) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L`;
}

export function RemainingVolumeBadge({
  volume,
  capacity = 0,
  byProduct,
  className,
}: {
  volume: number;
  capacity?: number;
  byProduct?: RemainingByProduct;
  className?: string;
}) {
  const tone = remainingStockTone(volume, capacity);
  const Icon = tone.Icon;
  const breakdown = PRODUCT_ORDER.filter((product) => (byProduct?.[product] ?? 0) !== 0)
    .map((product) => `${product} ${formatLiters(byProduct?.[product] ?? 0)}`)
    .join(" · ");
  const fill =
    capacity > 0 ? `${Math.round((Math.max(volume, 0) / capacity) * 100)}% of capacity` : null;

  return (
    <Badge
      variant="outline"
      title={[tone.hint, fill, breakdown].filter(Boolean).join(" · ")}
      className={cn("h-6 gap-1 px-2 font-medium", tone.className, className)}
    >
      <Icon className="size-3 shrink-0" />
      <span className="font-mono tabular-nums">{formatLiters(volume)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{tone.label}</span>
    </Badge>
  );
}
