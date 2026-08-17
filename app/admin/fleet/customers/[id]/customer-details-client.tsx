"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

type DeliveryRow = any;

const deliveryColumns: ColumnDef<DeliveryRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "litersDespatched",
    header: () => <div className="text-right">Liters</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono text-sm">
        {Number(row.original.litersDespatched).toLocaleString()} L
      </div>
    ),
  },
  {
    accessorKey: "totalExpectedAmount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono font-medium text-sm">
        ₦{Number(row.original.totalExpectedAmount).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === "CLEARED" ? "secondary" : "destructive"}
          className={status === "CLEARED" ? "bg-emerald-100 text-emerald-800" : ""}
        >
          {status}
        </Badge>
      );
    },
  },
];

export function CustomerDetailsClient({ deliveries }: { deliveries: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent deliveries</CardTitle>
      </CardHeader>
      <CardContent>
        {deliveries.length > 0 ? (
          <DataTable
            columns={deliveryColumns}
            data={deliveries}
          />
        ) : (
          <div className="text-center py-8 text-stone-500 text-sm">
            No deliveries records found for this customer.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
