"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import { formatDistanceToNow } from "date-fns";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";

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
  const [salesMin, setSalesMin] = useState<string>("");
  const [salesMax, setSalesMax] = useState<string>("");
  const [stockMin, setStockMin] = useState<string>("");
  const [stockMax, setStockMax] = useState<string>("");

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<StationRow>({
    baseUrl: "/api/tenant/stations",
    additionalParams: appliedFilters,
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const handleApplyFilters = () => {
    const filters: Record<string, string> = {};
    if (salesMin) filters.salesMin = salesMin;
    if (salesMax) filters.salesMax = salesMax;
    if (stockMin) filters.stockMin = stockMin;
    if (stockMax) filters.stockMax = stockMax;
    
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setSalesMin("");
    setSalesMax("");
    setStockMin("");
    setStockMax("");
    setAppliedFilters({});
  };

  const filterNode = (
    <div className="space-y-4 px-4">
      <div className="space-y-2">
        <Label>Today Sales Range (₦)</Label>
        <div className="flex items-center gap-2">
          <NumberInput 
            placeholder="Min" 
            value={salesMin} 
            onChange={(v) => setSalesMin(v.toString())} 
          />
          <span>-</span>
          <NumberInput 
            placeholder="Max" 
            value={salesMax} 
            onChange={(v) => setSalesMax(v.toString())} 
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Last Closing Stock (L)</Label>
        <div className="flex items-center gap-2">
          <NumberInput 
            placeholder="Min" 
            value={stockMin} 
            onChange={(v) => setStockMin(v.toString())} 
          />
          <span>-</span>
          <NumberInput 
            placeholder="Max" 
            value={stockMax} 
            onChange={(v) => setStockMax(v.toString())} 
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
        <Button variant="outline" onClick={handleClearFilters} className="w-full">Clear</Button>
      </div>
    </div>
  );

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
      filterNode={filterNode}
    />
  );
}
