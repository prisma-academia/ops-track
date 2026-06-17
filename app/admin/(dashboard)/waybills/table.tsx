"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WaybillRow = {
  id: string;
  number: string;
  status: "DISPATCHED" | "DELIVERED";
  productType: string;
  litersLoaded: number;
  litersReceived: number | null;
  truckPlate: string;
  driverName: string;
  driverPhone: string | null;
  dispatchedAt: string;
  deliveredAt: string | null;
  station: {
    id: string;
    name: string;
    code: string;
  };
};

export function WaybillsTable({
  data,
  onViewDetails,
}: {
  data: WaybillRow[];
  onViewDetails: (waybill: WaybillRow) => void;
}) {
  const columns: ColumnDef<WaybillRow>[] = [
    {
      accessorKey: "number",
      header: "Waybill",
      cell: ({ row }) => {
        const w = row.original;
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
              <span className="text-xs text-muted-foreground font-mono">
                {w.station.name} · {w.station.code}
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
        const variance = Number(w.litersLoaded) - Number(w.litersReceived);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-emerald-600">
              {Number(w.litersReceived).toLocaleString()}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold ${
                variance !== 0 ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {variance !== 0 ? (
                <AlertCircle size={10} />
              ) : (
                <CheckCircle2 size={10} />
              )}
              Var: {variance.toLocaleString()} L
            </span>
          </div>
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
    {
      id: "actions",
      header: () => <div className="text-center">Action</div>,
      cell: ({ row }) => {
        const w = row.original;
        return (
          <div className="flex items-center gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(w)}
              className="flex items-center gap-1 h-8 px-3 rounded-4xl"
            >
              <Eye className="size-3.5" /> Details
            </Button>
            {w.status === "DELIVERED" && w.deliveredAt && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(w.deliveredAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumnId="number"
      searchPlaceholder="Search by waybill number…"
    />
  );
}
