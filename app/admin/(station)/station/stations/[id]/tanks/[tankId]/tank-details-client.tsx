"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatHumanReadableDate } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TankDetailsClient({
  stationId,
  tankId,
  tank,
}: {
  stationId: string;
  tankId: string;
  tank: any;
}) {
  const stockMovementsQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${stationId}/tanks/${tankId}/stock-movements`,
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "recordedAt",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-foreground/90 font-medium">
          {formatHumanReadableDate(row.original.recordedAt)}
        </span>
      ),
    },
    {
      accessorKey: "movementType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.movementType;
        let colorClass = "bg-slate-100 text-slate-700";
        if (type === "DELIVERY" || type === "OPENING_BALANCE") colorClass = "bg-emerald-100 text-emerald-700";
        if (type === "SALE" || type === "LOSS") colorClass = "bg-rose-100 text-rose-700";
        if (type === "ADJUSTMENT") colorClass = "bg-amber-100 text-amber-700";

        return <Badge variant="outline" className={`${colorClass} font-semibold text-xs`}>{type.replace("_", " ")}</Badge>;
      },
    },
    {
      id: "quantity",
      header: () => <div className="text-right">Quantity</div>,
      cell: ({ row }) => {
        const q = Number(row.original.quantity);
        return (
          <div className={`text-right font-mono font-bold ${q >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {q > 0 ? "+" : ""}{q.toLocaleString()} L
          </div>
        );
      },
    },
    {
      id: "balanceAfter",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-medium text-muted-foreground">
          {Number(row.original.balanceAfter).toLocaleString()} L
        </div>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs line-clamp-1">{row.original.notes || "—"}</span>
      ),
    },
    {
      accessorKey: "referenceType",
      header: "Reference",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.referenceType || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
            <Link href={`/admin/station/stations/${stationId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <CardTitle className="text-xl">Tank Details: {tank.name}</CardTitle>
            <CardDescription>{tank.productType} • Capacity: {Number(tank.capacity).toLocaleString()} L</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Movements</CardTitle>
          <CardDescription>Auditable ledger of all volume changes for this tank.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={stockMovementsQuery.data ?? []}
            serverPagination={{
              ...stockMovementsQuery.meta,
              onPageChange: stockMovementsQuery.setPage,
              onPageSizeChange: stockMovementsQuery.setPageSize,
            }}
            isLoading={stockMovementsQuery.isLoading}
            empty="No stock movements found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
