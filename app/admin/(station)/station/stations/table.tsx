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
  state?: string | null;
  lga?: string | null;
  ward?: string | null;
  todaySales: { PMS: number; AGO: number; LPG: number };
  lastClosingStock: { PMS: number; AGO: number; LPG: number };
  lastSalesAmount: number;
  lastSalesDate?: string | null;
  lastSalesProducts?: { PMS: number; AGO: number; LPG: number };
  lastWaybillDate: string | null;
  derivedBalance: number;
};

const columns: ColumnDef<StationRow>[] = [
  { 
    accessorKey: "name", 
    header: "Station",
    cell: ({ row }) => {
      const name = row.original.name;
      const locationParts = [row.original.state, row.original.ward, row.original.lga].filter(Boolean);
      const locationText = locationParts.length > 0 ? locationParts.join(" - ") : "—";
      return (
        <div className="flex items-center gap-3 py-1 min-w-0 max-w-[200px] sm:max-w-[250px]">
          <div className="size-9 flex items-center justify-center shrink-0 text-primary">
            <Image
              src="/assets/icons/gps.png"
              alt="Station icon"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-semibold text-foreground truncate" title={name}>
              {name}
            </span>
            <span className="text-xs text-muted-foreground truncate" title={locationText}>
              {locationText}
            </span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "lastSalesAmount", 
    header: "Last Sales",
    cell: ({ row }) => {
      const amount = row.original.lastSalesAmount;
      const dateStr = row.original.lastSalesDate;
      if (!amount && !dateStr) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }

      const date = dateStr ? new Date(dateStr) : null;
      const formattedDate = date
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : null;

      const products = row.original.lastSalesProducts;
      const parts = [];
      if (products?.PMS) parts.push(`PMS: ₦${products.PMS.toLocaleString()}`);
      if (products?.AGO) parts.push(`AGO: ₦${products.AGO.toLocaleString()}`);
      if (products?.LPG) parts.push(`LPG: ₦${products.LPG.toLocaleString()}`);

      return (
        <div className="flex flex-col py-1">
          <span className="font-semibold text-foreground font-mono text-sm">
            ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {formattedDate && <span>{formattedDate}</span>}
            {parts.length > 0 && (
              <span className="text-[11px] text-muted-foreground/80 truncate max-w-[180px]" title={parts.join(" | ")}>
                • {parts.join(" | ")}
              </span>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "lastClosingStock",
    header: "Last Closing Stock",
    cell: ({ row }) => {
      const stock = row.original.lastClosingStock;
      const parts = [];
      if (stock.PMS) parts.push(`PMS: ${stock.PMS.toLocaleString()} L`);
      if (stock.AGO) parts.push(`AGO: ${stock.AGO.toLocaleString()} L`);
      if (stock.LPG) parts.push(`LPG: ${stock.LPG.toLocaleString()} L`);
      return parts.length ? (
        <span className="text-xs font-medium">{parts.join(" | ")}</span>
      ) : "—";
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

import { StationsFilterDrawer } from "./stations-filter-drawer";
import type { StationSimple } from "./stations-manager";

export function StationsTable({ 
  initialData, 
  initialMeta,
  stations = [],
}: { 
  initialData: StationRow[]; 
  initialMeta: any;
  stations?: StationSimple[];
}) {
  const searchParams = useSearchParams();
  
  const appliedFilters: Record<string, string> = {};
  const currentStationId = searchParams.get("stationId");
  if (currentStationId && currentStationId !== "ALL") appliedFilters.stationId = currentStationId;
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
      rowHref={(s) => `/admin/station/stations/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
      filterNode={<StationsFilterDrawer stations={stations} />}
    />
  );
}
