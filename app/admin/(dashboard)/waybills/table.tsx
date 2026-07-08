"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type WaybillRow = {
  id: string;
  number: string;
  status: "DISPATCHED" | "DELIVERED" | "COMPLETED";
  productType: string;
  litersLoaded: number;
  litersReceived: number | null;
  truckPlate: string;
  driverName: string;
  driverPhone: string | null;
  dispatchedAt: string;
  deliveredAt: string | null;
  stations: {
    id: string;
    name: string;
    code: string;
  }[];
};

export function WaybillsTable({
  data,
  filterNode,
  headerAction,
  serverPagination,
  isLoading,
}: {
  data: WaybillRow[];
  filterNode?: React.ReactNode;
  headerAction?: React.ReactNode;
  serverPagination?: any;
  isLoading?: boolean;
}) {
  const columns: ColumnDef<WaybillRow>[] = [
    {
      accessorKey: "number",
      header: "Waybill / Stations",
      cell: ({ row }) => {
        const w = row.original;
        const stationNames = w.stations?.map(s => s.name).join(", ") || "No stations";
        const stationCodes = w.stations?.map(s => s.code).join(", ") || "";
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="size-10 flex items-center justify-center shrink-0">
              <Image
                src="/assets/icons/gas-truck.png"
                alt="Waybill"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{w.number}</span>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" title={`${stationNames} · ${stationCodes}`}>
                {stationNames}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const pending = row.original.status === "DISPATCHED";
        return (
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              pending
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {row.original.status}
          </span>
        );
      },
    },
    {
      accessorKey: "productType",
      header: "Product",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
          {row.original.productType}
        </span>
      ),
    },
    {
      accessorKey: "litersLoaded",
      header: "Loaded (L)",
      cell: ({ row }) => Number(row.original.litersLoaded).toLocaleString(),
    },
    {
      accessorKey: "litersReceived",
      header: "Received (L)",
      cell: ({ row }) => {
        const w = row.original;
        if (w.litersReceived == null) return <span className="text-muted-foreground">—</span>;
        const variance = Number(w.litersReceived) - Number(w.litersLoaded);
        
        const tooltipText = variance < 0 
          ? `Shortage of ${Math.abs(variance).toLocaleString()} L`
          : variance > 0 
          ? `Addition of ${variance.toLocaleString()} L`
          : "Exact match";

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 w-fit cursor-help">
                <span className="font-medium text-emerald-600">
                  {Number(w.litersReceived).toLocaleString()}
                </span>
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold ${
                    variance < 0 ? "text-rose-600" : variance > 0 ? "text-amber-500" : "text-emerald-600"
                  }`}
                >
                  {variance === 0 ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <AlertCircle size={10} />
                  )}
                  Var: {variance > 0 ? '+' : ''}{variance.toLocaleString()} L
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "dispatchedAt",
      header: "Dispatched",
      cell: ({ row }) =>
        new Date(row.original.dispatchedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
  ];

  return (
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={data}
        filterColumnId="number"
        searchPlaceholder="Search by waybill number…"
        rowHref={(row) => `/admin/waybills/${row.id}`}
        filterNode={filterNode}
        headerAction={headerAction}
        serverPagination={serverPagination}
        isLoading={isLoading}
      />
    </TooltipProvider>
  );
}
