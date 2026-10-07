"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import { formatDistanceToNow } from "date-fns";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { useSearchParams } from "next/navigation";

const PRODUCT_ORDER = ["PMS", "AGO", "DPK", "LPG"] as const;

function formatLiters(value: number) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L`;
}

export type StationRow = {
  id: string;
  code: string;
  name: string;
  state?: string | null;
  lga?: string | null;
  ward?: string | null;
  todaySales: { PMS: number; AGO: number; LPG: number };
  lastClosingStock: { PMS: number; AGO: number; DPK?: number; LPG: number };
  lastClosingStockTotal: number;
  lastSalesAmount: number;
  lastSalesDate?: string | null;
  lastSalesProducts?: { PMS: number; AGO: number; LPG: number };
  lastSalesLiters?: Partial<Record<"PMS" | "AGO" | "DPK" | "LPG", number>>;
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
      const liters = row.original.lastSalesLiters ?? {};
      const parts = PRODUCT_ORDER.filter((product) => product in liters).map(
        (product) => `${product}: ${formatLiters(liters[product] ?? 0)}`,
      );

      if (!amount && !dateStr) {
        return <span className="text-xs font-medium">{parts.length ? parts.join(" | ") : "0 L"}</span>;
      }

      const date = dateStr ? new Date(dateStr) : null;
      const formattedDate = date
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : null;
      const litersLabel = parts.length ? parts.join(" | ") : "0 L";

      return (
        <div className="flex flex-col py-1">
          <span className="font-semibold text-foreground font-mono text-sm">
            ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {formattedDate && <span>{formattedDate}</span>}
            <span className="text-[11px] text-muted-foreground/80 truncate max-w-[220px]" title={litersLabel}>
              {formattedDate ? "• " : ""}{litersLabel}
            </span>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "lastClosingStock",
    header: "Last Closing Stock",
    cell: ({ row }) => {
      const total = row.original.lastClosingStockTotal ?? 0;
      return <span className="text-xs font-medium">{formatLiters(total)}</span>;
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
