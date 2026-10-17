"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export type SupplierOrderRow = {
  id: string;
  reference: string | null;
  productType: string;
  litersOrdered: number;
  supplierShortageLiters?: number;
  billableLiters?: number;
  totalPayable: number;
  paymentPaid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
};

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusVariant(status: string) {
  if (status === "CLEARED") return "default";
  if (status === "PART_PAID") return "secondary";
  return "outline";
}

export function SupplierOrdersTable({
  data,
  supplierId,
  showLocalPayableColumns = false,
}: {
  data: SupplierOrderRow[];
  supplierId: string;
  showLocalPayableColumns?: boolean;
}) {
  const columns = useMemo<ColumnDef<SupplierOrderRow>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Order",
        cell: ({ row }) => (
          <Link href={`/admin/orders/${row.original.id}`} className="font-medium hover:underline">
            {row.original.reference || row.original.id.slice(0, 8)}
          </Link>
        ),
      },
      {
        accessorKey: "productType",
        header: "Product",
      },
      {
        accessorKey: "litersOrdered",
        header: "Ordered (L)",
        cell: ({ row }) => row.original.litersOrdered.toLocaleString(),
      },
      ...(showLocalPayableColumns
        ? [
            {
              accessorKey: "supplierShortageLiters",
              header: "Shortage credit (L)",
              cell: ({ row }: { row: { original: SupplierOrderRow } }) =>
                (row.original.supplierShortageLiters ?? 0).toLocaleString(),
            } as ColumnDef<SupplierOrderRow>,
            {
              accessorKey: "billableLiters",
              header: "Billable (L)",
              cell: ({ row }: { row: { original: SupplierOrderRow } }) =>
                (row.original.billableLiters ?? row.original.litersOrdered).toLocaleString(),
            } as ColumnDef<SupplierOrderRow>,
          ]
        : []),
      {
        accessorKey: "totalPayable",
        header: "Total",
        cell: ({ row }) => formatNaira(row.original.totalPayable),
      },
      {
        accessorKey: "paymentPaid",
        header: "Paid",
        cell: ({ row }) => formatNaira(row.original.paymentPaid),
      },
      {
        accessorKey: "balance",
        header: "Remaining",
        cell: ({ row }) => (
          <span className={row.original.balance > 0 ? "text-rose-600 font-medium" : ""}>
            {formatNaira(row.original.balance)}
          </span>
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.paymentStatus)}>
            {row.original.paymentStatus.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.balance > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/admin/payments/new/outgoing?supplierId=${supplierId}&orderId=${row.original.id}`}
              >
                Pay
              </Link>
            </Button>
          ) : null,
      },
    ],
    [supplierId, showLocalPayableColumns],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumnId="reference"
      searchPlaceholder="Search orders..."
    />
  );
}
