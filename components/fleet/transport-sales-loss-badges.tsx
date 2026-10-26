"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Receipt,
  Truck,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTransportStatusLabel } from "@/lib/fleet/transport-loss";

export type TransportLossBreakdownItem = {
  type: string;
  liters: number;
};

export type TransportSalesLossSummary = {
  status: string;
  litersSold: number;
  litersLost: number;
  lossBreakdown: TransportLossBreakdownItem[];
  pendingDeliveries: number;
};

export function formatTransportLiters(value: number) {
  return `${value.toLocaleString()} L`;
}

export function formatLossTypeLabel(type: string) {
  return type.replace(/_/g, " ").toLowerCase();
}

function transportStatusIcon(status: string) {
  if (status === "COMPLETED") {
    return { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" };
  }
  if (status === "IN_TRANSIT") {
    return { icon: Truck, className: "text-indigo-600 dark:text-indigo-400" };
  }
  if (status === "LOSS") {
    return { icon: AlertTriangle, className: "text-rose-600 dark:text-rose-400" };
  }
  if (status === "CANCELLED") {
    return { icon: XCircle, className: "text-muted-foreground" };
  }
  return { icon: Clock3, className: "text-amber-600 dark:text-amber-400" };
}

export function TransportStatusBadge({ status }: { status: string }) {
  const { icon: Icon, className } = transportStatusIcon(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      {formatTransportStatusLabel(status)}
    </span>
  );
}

export function TransportSalesLossBadges({
  summary,
}: {
  summary: TransportSalesLossSummary;
}) {
  const lossTooltip = summary.lossBreakdown
    .map((item) => `${formatLossTypeLabel(item.type)}: ${formatTransportLiters(item.liters)}`)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {summary.litersSold > 0 ? (
        <span
          className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300"
        >
          <Receipt className="size-3 shrink-0" aria-hidden />
          <span className="tabular-nums">{formatTransportLiters(summary.litersSold)}</span>
          {summary.status === "COMPLETED" && summary.pendingDeliveries === 0 ? (
            <CheckCircle2 className="size-3 shrink-0 text-emerald-600" aria-hidden />
          ) : null}
        </span>
      ) : summary.pendingDeliveries > 0 ? (
        <span
          className="inline-flex h-6 items-center gap-1 rounded-md border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 px-2 text-[10px] font-medium text-amber-800 dark:text-amber-300"
        >
          <Clock3 className="size-3 shrink-0" aria-hidden />
          {summary.pendingDeliveries} pending
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">No sales</span>
      )}

      {summary.litersLost > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex h-6 cursor-help items-center gap-1 rounded-md border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/25 px-2 text-[10px] font-semibold text-rose-800 dark:text-rose-300"
            >
              <AlertTriangle className="size-3 shrink-0" aria-hidden />
              <span className="tabular-nums">{formatTransportLiters(summary.litersLost)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {lossTooltip || "Transport loss recorded"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
