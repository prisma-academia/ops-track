"use client";

import { useMemo, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { SupplierNavIcon } from "./_components/supplier-nav-icon";
import { SupplierTypeBadge } from "./_components/supplier-type-badge";

export type SupplierRow = {
  id: string;
  name: string;
  supplierType?: "LOCAL" | "DEPOT" | null;
  totalExpectedAmount?: number;
  amountPaid?: number;
  saleProfit?: number;
  companyLoss?: number;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactPosition?: string | null;
  outstandingBalance: number | string;
  depositBalance: number | string;
  createdAt: string;
};

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SuppliersTable({
  initialData,
  initialMeta,
}: {
  initialData: SupplierRow[];
  initialMeta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } =
    usePaginatedQuery<SupplierRow>({
      baseUrl: "/api/tenant/suppliers",
    });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const columns = useMemo<ColumnDef<SupplierRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Supplier",
        cell: ({ row }) => {
          const name = row.original.name;
          const subtitle = row.original.phone || row.original.email || "—";

          return (
            <div className="flex items-center gap-3">
              <SupplierNavIcon />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-foreground truncate">{name}</span>
                <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "supplierType",
        header: "Supplier Type",
        cell: ({ row }) => (
          <SupplierTypeBadge supplierType={row.original.supplierType} />
        ),
      },
      {
        accessorKey: "totalExpectedAmount",
        header: "Total Expected Amount",
        cell: ({ row }) => (
          <span className="text-sm font-mono tabular-nums">
            {formatNaira(Number(row.original.totalExpectedAmount ?? 0))}
          </span>
        ),
      },
      {
        accessorKey: "amountPaid",
        header: "Total Paid",
        cell: ({ row }) => (
          <span className="text-sm font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatNaira(Number(row.original.amountPaid ?? 0))}
          </span>
        ),
      },
      {
        accessorKey: "outstandingBalance",
        header: "Amount Owed",
        cell: ({ row }) => {
          const bal = Number(row.original.outstandingBalance || 0);
          return (
            <span
              className={
                bal > 0
                  ? "text-sm font-medium font-mono tabular-nums text-rose-600"
                  : "text-sm font-mono tabular-nums text-muted-foreground"
              }
            >
              {formatNaira(bal)}
            </span>
          );
        },
      },
      {
        accessorKey: "saleProfit",
        header: "Profit on Sale",
        cell: ({ row }) => {
          const v = Number(row.original.saleProfit ?? 0);
          return (
            <span
              className={
                v >= 0
                  ? "text-sm font-mono tabular-nums text-emerald-600"
                  : "text-sm font-mono tabular-nums text-rose-600"
              }
            >
              {formatNaira(v)}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data.length > 0 ? data : initialData}
      isLoading={isLoading}
      serverPagination={{
        ...meta,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      rowHref={(row) => `/admin/suppliers/${row.id}`}
      filterColumnId="name"
      searchPlaceholder="Search suppliers..."
    />
  );
}
