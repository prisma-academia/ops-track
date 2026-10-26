"use client";

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { TankerTruckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  reference: string;
  sourceDepot: string | null;
  supplier: string | null;
  productType: string;
  litersOrdered: number;
  litersLifted: number;
  litersRemaining: number;
  litersSold: number;
  litersLost: number;
  soldRemaining: number;
  fulfillmentProgress: number;
  soldProgress: number;
  lossProgress: number;
  remainingToSellProgress: number;
  pricePerLitre: number;
  totalCost: number;
  status: string;
  transportCount: number;
  createdAt: string;
};

const CELLULAR_BAR_COUNT = 5;
const CELLULAR_BAR_HEIGHT_PX = 12;
const CELLULAR_BAR_WIDTH_PX = 3;

/** Open volume still to lift / sell (distinct from loss or shortage). */
const REMAINING_BAR_COLOR = "bg-stone-300 dark:bg-stone-600";
const REMAINING_BAR_EMPTY = "bg-stone-200/90 dark:bg-stone-700/80";
const LOSS_BAR_COLOR = "bg-rose-600 dark:bg-rose-500";

type StatusTone = {
  label: string;
  text: string;
  dot: string;
  bar: string;
};

const ORDER_STATUS_TONES: Record<string, StatusTone> = {
  DRAFT: {
    label: "Draft",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
    bar: "bg-amber-500",
  },
  PENDING: {
    label: "Pending",
    text: "text-stone-600 dark:text-stone-400",
    dot: "bg-stone-500 dark:bg-stone-400",
    bar: "bg-stone-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-600 dark:bg-blue-400",
    bar: "bg-blue-500",
  },
  ASSIGNED: {
    label: "Assigned",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-600 dark:bg-violet-400",
    bar: "bg-violet-500",
  },
  IN_TRANSIT: {
    label: "In transit",
    text: "text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-600 dark:bg-indigo-400",
    bar: "bg-indigo-500",
  },
  DELIVERED: {
    label: "Delivered",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-600 dark:bg-sky-400",
    bar: "bg-sky-500",
  },
  COMPLETED: {
    label: "Completed",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    bar: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-600 dark:bg-rose-400",
    bar: "bg-rose-500",
  },
  REJECTED: {
    label: "Rejected",
    text: "text-rose-800 dark:text-rose-300",
    dot: "bg-rose-700 dark:bg-rose-300",
    bar: "bg-rose-600",
  },
};

function formatLiters(value: number) {
  return `${value.toLocaleString()} L`;
}

function statusTone(status: string): StatusTone {
  const key = status.toUpperCase();
  if (ORDER_STATUS_TONES[key]) return ORDER_STATUS_TONES[key];
  return {
    label: status.replace(/_/g, " ").toLowerCase(),
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    bar: "bg-primary",
  };
}

function progressBarColor(percent: number, status: string) {
  if (percent >= 100) return "bg-emerald-500";
  const tone = statusTone(status);
  if (percent > 0) return tone.bar;
  return "bg-muted-foreground/25";
}

type BarSegment = { percent: number; color: string };

function barSlotColors(segments: BarSegment[], emptyColor = "bg-muted"): string[] {
  const slots = Array.from({ length: CELLULAR_BAR_COUNT }, () => emptyColor);
  let index = 0;
  for (const segment of segments) {
    if (index >= CELLULAR_BAR_COUNT) break;
    const pct = Math.min(100, Math.max(0, segment.percent));
    if (pct <= 0) continue;
    const barsForSegment = Math.max(1, Math.ceil((pct / 100) * CELLULAR_BAR_COUNT));
    for (let i = 0; i < barsForSegment && index < CELLULAR_BAR_COUNT; i += 1) {
      slots[index] = segment.color;
      index += 1;
    }
  }
  return slots;
}

function CellularVolumeBar({
  segments,
  className,
  remainderColor = "bg-muted",
}: {
  segments: BarSegment[];
  className?: string;
  remainderColor?: string;
}) {
  const colors = barSlotColors(segments, remainderColor);

  return (
    <div
      className={cn("flex items-center gap-[2px]", className)}
      style={{ height: CELLULAR_BAR_HEIGHT_PX }}
      aria-hidden
    >
      {colors.map((color, index) => (
        <div
          key={index}
          className={cn("rounded-[2px] transition-colors shrink-0", color)}
          style={{
            width: CELLULAR_BAR_WIDTH_PX,
            height: CELLULAR_BAR_HEIGHT_PX,
          }}
        />
      ))}
    </div>
  );
}

function CellularVolumeBarFromPercent({
  percent,
  status,
  className,
  remainderColor = REMAINING_BAR_COLOR,
}: {
  percent: number;
  status: string;
  className?: string;
  remainderColor?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillColor = progressBarColor(clamped, status);
  const segments: BarSegment[] =
    clamped > 0 ? [{ percent: clamped, color: fillColor }] : [];
  const emptyColor = clamped < 100 ? remainderColor : "bg-muted";
  return (
    <CellularVolumeBar segments={segments} className={className} remainderColor={emptyColor} />
  );
}

function OrderStatusLabel({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize", tone.text)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      {tone.label}
    </span>
  );
}

type VolumeTooltipLine = {
  label: string;
  value: string;
  tone?: "default" | "muted" | "sold" | "loss" | "remaining";
};

function volumeTooltipLineClass(tone: VolumeTooltipLine["tone"]) {
  if (tone === "sold") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "loss") return "text-rose-600 dark:text-rose-400";
  if (tone === "remaining") return "text-stone-600 dark:text-stone-400";
  if (tone === "muted") return "text-muted-foreground";
  return "text-foreground";
}

function OrderVolumeBarTooltip({
  children,
  title,
  lines,
}: {
  children: ReactNode;
  title: string;
  lines: VolumeTooltipLine[];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="w-fit max-w-full cursor-help"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3 max-w-[260px]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </p>
        <ul className="space-y-1.5 text-xs">
          {lines.map((line) => (
            <li key={line.label} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{line.label}</span>
              <span className={cn("font-mono tabular-nums font-medium", volumeTooltipLineClass(line.tone))}>
                {line.value}
              </span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function soldVolumeFootnote(
  litersSold: number,
  litersLost: number,
  remainingToSell: number
) {
  if (remainingToSell > 0 && litersLost > 0) {
    return {
      text: `${formatLiters(remainingToSell)} remaining · ${formatLiters(litersLost)} loss`,
      className: "text-muted-foreground",
    };
  }
  if (remainingToSell > 0) {
    return {
      text: `${formatLiters(remainingToSell)} remaining to sell`,
      className: "text-muted-foreground",
    };
  }
  if (litersLost > 0) {
    return {
      text: `${formatLiters(litersLost)} loss`,
      className: "text-rose-600 dark:text-rose-400 font-medium",
    };
  }
  if (litersSold > 0) {
    return { text: "Fully sold", className: "text-emerald-600 dark:text-emerald-400" };
  }
  return { text: "Not yet sold", className: "text-muted-foreground" };
}

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "reference",
    header: "Order Reference",
    cell: ({ row }) => {
      const ref = row.original.reference;
      const depot = row.original.sourceDepot?.trim();
      const supplier = row.original.supplier?.trim();
      const subtitle =
        depot && supplier
          ? `${depot} • ${supplier}`
          : depot || supplier || row.original.productType;
      return (
        <div className="flex items-center gap-3 py-1 min-w-0 max-w-[200px] sm:max-w-[250px]">
          <div className="size-9 flex items-center justify-center shrink-0 text-primary">
            <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-semibold text-foreground truncate" title={ref}>
              {ref}
            </span>
            <span
              className="text-xs text-muted-foreground uppercase truncate"
              title={subtitle}
            >
              {subtitle}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "litersOrdered",
    header: "Volume & Lifted",
    cell: ({ row }) => {
      const { litersOrdered, litersLifted, litersRemaining, fulfillmentProgress, status } =
        row.original;
      const liftNote =
        litersRemaining > 0
          ? `${formatLiters(litersRemaining)} remaining to lift`
          : "Fully lifted";

      return (
        <OrderVolumeBarTooltip
          title="Lift volume"
          lines={[
            { label: "Ordered", value: formatLiters(litersOrdered) },
            { label: "Lifted", value: formatLiters(litersLifted), tone: "sold" },
            {
              label: "Remaining to lift",
              value: formatLiters(litersRemaining),
              tone: litersRemaining > 0 ? "remaining" : "muted",
            },
            { label: "Lift progress", value: `${fulfillmentProgress}%`, tone: "muted" },
          ]}
        >
          <div className="flex flex-col gap-1 py-1 min-w-[130px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold font-mono tabular-nums text-foreground">
                {formatLiters(litersOrdered)}
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
                {fulfillmentProgress}%
              </span>
            </div>
            <CellularVolumeBarFromPercent
              percent={fulfillmentProgress}
              status={status}
              remainderColor={litersRemaining > 0 ? REMAINING_BAR_COLOR : "bg-muted"}
            />
            <span className="text-[10px] leading-tight text-muted-foreground">{liftNote}</span>
          </div>
        </OrderVolumeBarTooltip>
      );
    },
  },
  {
    accessorKey: "litersSold",
    header: "Sold",
    cell: ({ row }) => {
      const {
        litersOrdered,
        litersSold,
        litersLost,
        soldRemaining,
        soldProgress,
        lossProgress,
        remainingToSellProgress,
      } = row.original;
      const footnote = soldVolumeFootnote(litersSold, litersLost, soldRemaining);
      const barSegments: BarSegment[] = [];
      if (soldProgress > 0) {
        barSegments.push({ percent: soldProgress, color: "bg-emerald-500" });
      }
      if (lossProgress > 0) {
        barSegments.push({ percent: lossProgress, color: LOSS_BAR_COLOR });
      }
      if (remainingToSellProgress > 0) {
        barSegments.push({ percent: remainingToSellProgress, color: REMAINING_BAR_COLOR });
      }

      const soldTooltipLines: VolumeTooltipLine[] = [
        { label: "Ordered", value: formatLiters(litersOrdered) },
        { label: "Sold", value: formatLiters(litersSold), tone: "sold" },
        {
          label: "Loss / shortage",
          value: formatLiters(litersLost),
          tone: litersLost > 0 ? "loss" : "muted",
        },
        {
          label: "Remaining to sell",
          value: formatLiters(soldRemaining),
          tone: soldRemaining > 0 ? "remaining" : "muted",
        },
        { label: "Sold progress", value: `${soldProgress}%`, tone: "muted" },
      ];

      return (
        <OrderVolumeBarTooltip title="Sales volume" lines={soldTooltipLines}>
          <div className="flex flex-col gap-1 py-1 min-w-[118px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold font-mono tabular-nums text-foreground">
                {formatLiters(litersSold)}
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
                {soldProgress}%
              </span>
            </div>
            <CellularVolumeBar
              segments={barSegments}
              remainderColor={soldRemaining > 0 ? REMAINING_BAR_EMPTY : "bg-muted"}
            />
            <span className={cn("text-[10px] leading-tight", footnote.className)}>
              {footnote.text}
            </span>
          </div>
        </OrderVolumeBarTooltip>
      );
    },
  },
  {
    accessorKey: "pricePerLitre",
    header: "Rate/L",
    cell: ({ row }) => {
      const rate = row.original.pricePerLitre;
      return rate > 0 ? `₦${rate.toLocaleString()}` : "—";
    },
  },
  {
    accessorKey: "totalCost",
    header: "Est. Cost",
    cell: ({ row }) => {
      const cost = row.original.totalCost;
      return cost > 0 ? `₦${cost.toLocaleString()}` : "—";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <OrderStatusLabel status={row.original.status} />,
  },
  {
    accessorKey: "transportCount",
    header: "Trips",
    cell: ({ row }) => {
      const count = row.original.transportCount;
      return (
        <span
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-transparent px-2 text-[11px] font-semibold text-foreground"
        >
          <HugeiconsIcon
            icon={TankerTruckIcon}
            size={14}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground"
          />
          <span className="tabular-nums">{count}</span>
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    },
  },
];

export function OrdersTable({
  data,
  serverPagination,
  filterNode,
}: {
  data: OrderRow[];
  serverPagination?: any;
  filterNode?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("take", newSize.toString());
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <DataTable
        columns={columns}
        data={data}
        rowHref={(s) => `/admin/orders/${s.id}`}
        filterColumnId="reference"
        searchPlaceholder="Search by reference…"
        filterNode={filterNode}
        {...(serverPagination
          ? {
              serverPagination: {
                ...serverPagination,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
              },
            }
          : {})}
      />
    </TooltipProvider>
  );
}
