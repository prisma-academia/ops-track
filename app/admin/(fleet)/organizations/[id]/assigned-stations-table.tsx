"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Fuel } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type AssignedStationRow = {
  id: string;
  name: string;
  code: string;
  location: string;
  debt: number;
  payment: number;
  paid: number;
  litersCollected: number;
  lastCollectedAt: string | null;
  deliveryCount: number;
};

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const columns: ColumnDef<AssignedStationRow>[] = [
  {
    accessorKey: "name",
    header: "Station",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 py-1">
        <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
          <Fuel className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.original.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{row.original.code}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "debt",
    header: "Debt",
    cell: ({ row }) => {
      const debt = row.original.debt;
      return (
        <span className={debt > 0 ? "font-medium text-rose-600" : "text-muted-foreground"}>
          {formatNaira(debt)}
        </span>
      );
    },
  },
  {
    accessorKey: "payment",
    header: "Payment",
    cell: ({ row }) => formatNaira(row.original.payment),
  },
  {
    accessorKey: "paid",
    header: "Paid",
    cell: ({ row }) => (
      <span className={row.original.paid > 0 ? "font-medium text-emerald-600" : "text-muted-foreground"}>
        {formatNaira(row.original.paid)}
      </span>
    ),
  },
  {
    accessorKey: "litersCollected",
    header: "Total Litres Collected",
    cell: ({ row }) => `${row.original.litersCollected.toLocaleString()} L`,
  },
  {
    accessorKey: "lastCollectedAt",
    header: "Last Collected",
    cell: ({ row }) => {
      const dateStr = row.original.lastCollectedAt;
      if (!dateStr) return <span className="text-muted-foreground">—</span>;
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
  {
    accessorKey: "deliveryCount",
    header: "Deliveries",
    cell: ({ row }) => row.original.deliveryCount.toLocaleString(),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.location || "—"}</span>
    ),
  },
];

export function AssignedStationsTable({ data }: { data: AssignedStationRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/deliveries?customerStationId=s-${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search stations…"
      empty="No stations assigned to this organization yet."
    />
  );
}
