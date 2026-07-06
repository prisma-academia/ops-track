"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { ReceiptText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export type LedgerRow = {
  id: string;
  type: string;
  amount: number;
  reference: string;
  description: string;
  entityName: string;
  relatedRef: string;
  status: string;
  createdAt: string;
};

const columns: ColumnDef<LedgerRow>[] = [
  { 
    accessorKey: "reference", 
    header: "Reference",
    cell: ({ row }) => {
      const ref = row.original.reference;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{ref}</span>
            <span className="text-xs text-muted-foreground">{row.original.entityName}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "type", 
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
      if (type === "EARNING") variant = "default";
      if (type === "DEDUCTION") variant = "destructive";
      if (type === "PAYOUT") variant = "secondary";
      return (
        <Badge variant={variant}>
          {type}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "amount", 
    header: "Amount (₦)",
    cell: ({ row }) => {
      const amount = row.original.amount;
      const type = row.original.type;
      const color = type === "DEDUCTION" ? "text-red-600 dark:text-red-400" : type === "EARNING" ? "text-emerald-600 dark:text-emerald-400" : "";
      return <span className={`font-medium ${color}`}>₦{amount.toLocaleString()}</span>;
    }
  },
  { 
    accessorKey: "description", 
    header: "Description",
    cell: ({ row }) => row.original.description
  },
  { 
    accessorKey: "relatedRef", 
    header: "Related",
    cell: ({ row }) => row.original.relatedRef
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === "PENDING" ? "secondary" : "default"}>
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

export function LedgerTable({ data }: { data: LedgerRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumnId="reference"
      searchPlaceholder="Search by reference…"
    />
  );
}
