"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Calculator } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type PnLRow = {
  id: string;
  reference: string;
  productType: string;
  litersOrdered: number;
  date: string;
  status: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
};

const columns: ColumnDef<PnLRow>[] = [
  { 
    accessorKey: "reference", 
    header: "Order Ref",
    cell: ({ row }) => {
      const ref = row.original.reference;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-emerald-600 bg-emerald-500/10 rounded-md">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{ref}</span>
            <span className="text-xs text-muted-foreground">{row.original.productType} • {row.original.litersOrdered.toLocaleString()}L</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "totalRevenue", 
    header: "Revenue",
    cell: ({ row }) => {
      const val = row.original.totalRevenue;
      return <span className="font-mono">₦{val.toLocaleString()}</span>;
    }
  },
  { 
    accessorKey: "totalCosts", 
    header: "Total Costs",
    cell: ({ row }) => {
      const val = row.original.totalCosts;
      return <span className="font-mono text-muted-foreground">₦{val.toLocaleString()}</span>;
    }
  },
  { 
    accessorKey: "netProfit", 
    header: "Net Profit",
    cell: ({ row }) => {
      const val = row.original.netProfit;
      return (
        <span className={cn("font-mono font-bold", val >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {val >= 0 ? "+" : "-"}₦{Math.abs(val).toLocaleString()}
        </span>
      );
    }
  },
  { 
    accessorKey: "date", 
    header: "Date",
    cell: ({ row }) => {
      const dateStr = row.original.date;
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

export function PnLTable({ data }: { data: PnLRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/pnl/${s.id}`}
      filterColumnId="reference"
      searchPlaceholder="Search by reference…"
    />
  );
}
