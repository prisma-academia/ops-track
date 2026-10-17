"use client";

import { useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Truck } from "lucide-react";

export type SupplierRow = {
  id: string;
  name: string;
  supplierType?: "LOCAL" | "DEPOT" | null;
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
          const initials = name
            ? name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "SP";
          const subtitle = row.original.phone || row.original.contactPerson || "Product supplier";

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {initials || <Truck className="h-4 w-4 text-muted-foreground" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{name}</span>
                <span className="text-xs text-muted-foreground font-mono">{subtitle}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "supplierType",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.supplierType;
          if (!type) {
            return (
              <span className="text-xs font-medium text-amber-600">Not set</span>
            );
          }
          return (
            <span className="text-xs font-medium text-foreground">
              {type === "LOCAL" ? "Local" : "Depot"}
            </span>
          );
        },
      },
      {
        accessorKey: "amountPaid",
        header: "Paid",
        cell: ({ row }) => (
          <span className="text-sm font-mono tabular-nums">
            {formatNaira(Number(row.original.amountPaid ?? 0))}
          </span>
        ),
      },
      {
        accessorKey: "saleProfit",
        header: "Sale profit",
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
      {
        accessorKey: "companyLoss",
        header: "Company loss",
        cell: ({ row }) => (
          <span className="text-sm font-mono tabular-nums text-rose-600">
            {formatNaira(Number(row.original.companyLoss ?? 0))}
          </span>
        ),
      },
      {
        accessorKey: "contactPerson",
        header: "Contact",
        cell: ({ row }) => {
          const person = row.original.contactPerson;
          if (!person) return <span className="text-sm text-muted-foreground">—</span>;
          return <span className="text-sm font-medium">{person}</span>;
        },
      },
      {
        accessorKey: "outstandingBalance",
        header: "Amount Owed",
        cell: ({ row }) => {
          const bal = Number(row.original.outstandingBalance || 0);
          return (
            <span className={bal > 0 ? "text-sm font-medium text-rose-600" : "text-sm text-muted-foreground"}>
              {formatNaira(bal)}
            </span>
          );
        },
      },
      {
        accessorKey: "depositBalance",
        header: "Prepaid Deposit",
        cell: ({ row }) => {
          const bal = Number(row.original.depositBalance || 0);
          return (
            <span className={bal > 0 ? "text-sm font-medium text-emerald-600" : "text-sm text-muted-foreground"}>
              {formatNaira(bal)}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.createdAt), "MMM d, yyyy")}
          </span>
        ),
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
