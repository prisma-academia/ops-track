"use client";

import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import { formatDistanceToNow } from "date-fns";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

export type StationRow = {
  id: string;
  code: string;
  name: string;
  pmsLiters: number;
  agoLiters: number;
  lpgLiters: number;
  lastSalesAmount: number;
  lastWaybillDate: string | null;
  derivedBalance: number;
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
    header: "Last Approved Sales",
    cell: ({ row }) => {
      const amount = row.original.lastSalesAmount;
      return amount > 0 ? `₦${amount.toLocaleString()}` : "—";
    }
  },
  { 
    accessorKey: "derivedBalance", 
    header: "Wallet Balance",
    cell: ({ row }) => {
      const balance = row.original.derivedBalance;
      const isDebt = balance < 0;
      const formatted = `₦${Math.abs(balance).toLocaleString()}`;
      return (
        <span className={isDebt ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>
          {isDebt ? `-${formatted}` : formatted}
        </span>
      );
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

export function StationsTable({ initialData, initialMeta }: { initialData: StationRow[], initialMeta: any }) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<StationRow>({
    baseUrl: "/api/tenant/stations",
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  return (
    <DataTable
      columns={columns}
      data={(data ?? []).length > 0 ? data : initialData}
      isLoading={isLoading}
      serverPagination={{
        ...meta,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      rowHref={(s) => `/admin/stations/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
