"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { BadgeDollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export type SaleRow = {
  id: string;
  customerName: string;
  transportDetails: string;
  litersDespatched: number;
  litersReceived: number | null;
  totalExpectedAmount: number;
  paymentReceived: number;
  status: string;
  transactionCount: number;
  createdAt: string;
};

const columns: ColumnDef<SaleRow>[] = [
  { 
    accessorKey: "customerName", 
    header: "Customer",
    cell: ({ row }) => {
      const name = row.original.customerName;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{row.original.transportDetails}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "litersReceived", 
    header: "Vol. Received (L)",
    cell: ({ row }) => {
      const vol = row.original.litersReceived;
      return vol != null ? vol.toLocaleString() : "Pending";
    }
  },
  { 
    accessorKey: "totalExpectedAmount", 
    header: "Expected Amt (₦)",
    cell: ({ row }) => row.original.totalExpectedAmount.toLocaleString()
  },
  { 
    accessorKey: "paymentReceived", 
    header: "Paid (₦)",
    cell: ({ row }) => row.original.paymentReceived.toLocaleString()
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === "UNPAID") variant = "destructive";
      if (status === "PART_PAID") variant = "secondary";
      if (status === "CLEARED") variant = "default";
      if (status === "OVERDUE") variant = "destructive";
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    }
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

export function SalesTable({ data }: { data: SaleRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/sales/${s.id}`}
      filterColumnId="customerName"
      searchPlaceholder="Search by customer name…"
    />
  );
}
