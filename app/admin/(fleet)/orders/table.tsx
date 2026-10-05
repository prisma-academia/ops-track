"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  reference: string;
  productType: string;
  litersOrdered: number;
  litersLifted: number;
  litersRemaining: number;
  fulfillmentProgress: number;
  pricePerLitre: number;
  totalCost: number;
  status: string;
  transportCount: number;
  createdAt: string;
};

const columns: ColumnDef<OrderRow>[] = [
  { 
    accessorKey: "reference", 
    header: "Order Reference",
    cell: ({ row }) => {
      const ref = row.original.reference;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{ref}</span>
            <span className="text-xs text-muted-foreground">{row.original.productType}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "litersOrdered", 
    header: "Volume & Progress",
    cell: ({ row }) => {
      const { litersOrdered, litersRemaining, fulfillmentProgress } = row.original;
      return (
        <div className="flex flex-col gap-1.5 py-1 min-w-[150px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {litersOrdered.toLocaleString()} L
            </span>
            <span className="text-[11px] font-medium font-mono text-muted-foreground">
              {fulfillmentProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                fulfillmentProgress >= 100
                  ? "bg-emerald-500"
                  : fulfillmentProgress > 0
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
              style={{ width: `${Math.min(100, Math.max(0, fulfillmentProgress))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {litersRemaining > 0
                ? `${litersRemaining.toLocaleString()} L remaining`
                : "Fully lifted"}
            </span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "pricePerLitre", 
    header: "Rate/L",
    cell: ({ row }) => {
      const rate = row.original.pricePerLitre;
      return rate > 0 ? `₦${rate.toLocaleString()}` : "—";
    }
  },
  { 
    accessorKey: "totalCost", 
    header: "Est. Cost",
    cell: ({ row }) => {
      const cost = row.original.totalCost;
      return cost > 0 ? `₦${cost.toLocaleString()}` : "—";
    }
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === "PENDING") variant = "secondary";
      if (status === "CONFIRMED") variant = "default";
      if (status === "CANCELLED") variant = "destructive";
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "transportCount", 
    header: "Trips",
    cell: ({ row }) => row.original.transportCount
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
    }
  },
];

export function OrdersTable({ data, serverPagination, filterNode }: { data: OrderRow[]; serverPagination?: any; filterNode?: React.ReactNode }) {
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
      {...(serverPagination ? {
        serverPagination: {
          ...serverPagination,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      } : {})}
    />
  );
}
