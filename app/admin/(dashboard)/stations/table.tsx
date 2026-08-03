"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import { formatDistanceToNow } from "date-fns";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { useSearchParams } from "next/navigation";

export type StationRow = {
  id: string;
  code: string;
  name: string;
  pmsLiters: number;
  agoLiters: number;
  lpgLiters: number;
  todaySales: { PMS: number; AGO: number; LPG: number };
  lastClosingStock: number;
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
    accessorKey: "todaySales", 
    header: "Today's Sales",
    cell: ({ row }) => {
      const sales = row.original.todaySales;
      const parts = [];
      if (sales.PMS) parts.push(`PMS: ₦${sales.PMS.toLocaleString()}`);
      if (sales.AGO) parts.push(`AGO: ₦${sales.AGO.toLocaleString()}`);
      if (sales.LPG) parts.push(`LPG: ₦${sales.LPG.toLocaleString()}`);
      return parts.length ? (
        <span className="text-xs font-medium">{parts.join(" | ")}</span>
      ) : "—";
    }
  },
  {
    accessorKey: "lastClosingStock",
    header: "Last Closing Stock",
    cell: ({ row }) => {
      const val = row.original.lastClosingStock;
      return val > 0 ? `${val.toLocaleString()} L` : "—";
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
  const searchParams = useSearchParams();
  
  const appliedFilters: Record<string, string> = {};
  if (searchParams.has("salesMin")) appliedFilters.salesMin = searchParams.get("salesMin")!;
  if (searchParams.has("salesMax")) appliedFilters.salesMax = searchParams.get("salesMax")!;
  if (searchParams.has("stockMin")) appliedFilters.stockMin = searchParams.get("stockMin")!;
  if (searchParams.has("stockMax")) appliedFilters.stockMax = searchParams.get("stockMax")!;

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<StationRow>({
    baseUrl: "/api/tenant/stations",
    additionalParams: appliedFilters,
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
      filterNode={
        <DataTableFilterDrawer
          filters={[
            {
              type: "number-range",
              label: "Today Sales Range (₦)",
              fromParam: "salesMin",
              toParam: "salesMax",
            },
            {
              type: "number-range",
              label: "Last Closing Stock (L)",
              fromParam: "stockMin",
              toParam: "stockMax",
            },
          ]}
        />
      }
    />
  );
}
