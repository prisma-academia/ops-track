"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import logo from '@/assets/logo.png';
import { Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type StationRow = {
  id: string;
  code: string;
  name: string;
  pmsLiters: number;
  agoLiters: number;
  lpgLiters: number;
  lastSalesAmount: number;
  lastWaybillDate: string | null;
};

const columns: ColumnDef<StationRow>[] = [
  { 
    accessorKey: "name", 
    header: "Station",
    cell: ({ row }) => {
      const name = row.original.name;
      const code = row.original.code;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary">
            <Image
              src="/assets/icons/gps.png"
              alt="My Image"
              width={500}
              height={300}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground font-mono">{code}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "pmsLiters", 
    header: "PMS (L)",
    cell: ({ row }) => row.original.pmsLiters.toLocaleString()
  },
  { 
    accessorKey: "agoLiters", 
    header: "AGO (L)",
    cell: ({ row }) => row.original.agoLiters.toLocaleString()
  },
  { 
    accessorKey: "lpgLiters", 
    header: "LPG (L)",
    cell: ({ row }) => row.original.lpgLiters.toLocaleString()
  },
  { 
    accessorKey: "lastSalesAmount", 
    header: "Last Sales Amount",
    cell: ({ row }) => {
      const amount = row.original.lastSalesAmount;
      return amount > 0 ? `₦${amount.toLocaleString()}` : "—";
    }
  },
  { 
    accessorKey: "lastWaybillDate", 
    header: "Last Waybill Date",
    cell: ({ row }) => {
      const dateStr = row.original.lastWaybillDate;
      if (!dateStr) return "—";
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

export function StationsTable({ data }: { data: StationRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/stations/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
