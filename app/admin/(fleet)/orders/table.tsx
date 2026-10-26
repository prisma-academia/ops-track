"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { TankerTruckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

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
  soldRemaining: number;
  fulfillmentProgress: number;
  soldProgress: number;
  pricePerLitre: number;
  totalCost: number;
  status: string;
  transportCount: number;
  createdAt: string;
};

const CELLULAR_BAR_COUNT = 5;
const CELLULAR_BAR_HEIGHT_PX = 12;
const CELLULAR_BAR_WIDTH_PX = 3;

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

function CellularVolumeBar({
  percent,
  status,
  className,
}: {
  percent: number;
  status: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filledBars = clamped <= 0 ? 0 : Math.max(1, Math.ceil((clamped / 100) * CELLULAR_BAR_COUNT));
  const activeColor = progressBarColor(clamped, status);

  return (
    <div
      className={cn("flex items-center gap-[2px]", className)}
      style={{ height: CELLULAR_BAR_HEIGHT_PX }}
      aria-hidden
    >
      {Array.from({ length: CELLULAR_BAR_COUNT }, (_, index) => {
        const active = index < filledBars;
        return (
          <div
            key={index}
            className={cn(
              "rounded-[2px] transition-colors shrink-0",
              active ? activeColor : "bg-muted"
            )}
            style={{
              width: CELLULAR_BAR_WIDTH_PX,
              height: CELLULAR_BAR_HEIGHT_PX,
            }}
          />
        );
      })}
    </div>
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

function VolumeMetricCell({
  primary,
  remaining,
  remainingText,
  completeText,
  percent,
  status,
}: {
  primary: number;
  remaining: number;
  remainingText: string;
  completeText: string;
  percent: number;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-1 min-w-[118px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold font-mono tabular-nums text-foreground">
          {formatLiters(primary)}
        </span>
        <span className="text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
          {percent}%
        </span>
      </div>
      <CellularVolumeBar percent={percent} status={status} />
      <span className="text-[10px] text-muted-foreground leading-tight">
        {remaining > 0 ? remainingText : completeText}
      </span>
    </div>
  );
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
      const { litersOrdered, litersRemaining, fulfillmentProgress, status } = row.original;
      const liftNote =
        litersRemaining > 0
          ? `${formatLiters(litersRemaining)} remaining to lift`
          : "Fully lifted";

      return (
        <div className="flex flex-col gap-1 py-1 min-w-[130px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold font-mono tabular-nums text-foreground">
              {formatLiters(litersOrdered)}
            </span>
            <span className="text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
              {fulfillmentProgress}%
            </span>
          </div>
          <CellularVolumeBar percent={fulfillmentProgress} status={status} />
          <span className="text-[10px] text-muted-foreground leading-tight">{liftNote}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "litersSold",
    header: "Sold",
    cell: ({ row }) => {
      const { litersSold, soldRemaining, soldProgress, status } = row.original;
      const soldCompleteText =
        soldRemaining <= 0 && litersSold > 0 ? "Fully sold" : "Not yet sold";
      return (
        <VolumeMetricCell
          primary={litersSold}
          remaining={soldRemaining}
          remainingText={`${formatLiters(soldRemaining)} remaining`}
          completeText={soldCompleteText}
          percent={soldProgress}
          status={status}
        />
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
  );
}
