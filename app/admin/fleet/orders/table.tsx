"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export type OrderRow = {
  id: string;
  reference: string;
  productType: string;
  litersOrdered: number;
  sourceDepot: string;
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
    header: "Volume (L)",
    cell: ({ row }) => row.original.litersOrdered.toLocaleString()
  },
  { 
    accessorKey: "sourceDepot", 
    header: "Depot",
    cell: ({ row }) => row.original.sourceDepot
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

export function OrdersTable({ data }: { data: OrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/orders/${s.id}`}
      filterColumnId="reference"
      searchPlaceholder="Search by reference…"
    />
  );
}
