"use client";

import { useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";

export type CustomerRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
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

export function CustomersTable({
  initialData,
  initialMeta,
}: {
  initialData: CustomerRow[];
  initialMeta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<CustomerRow>({
    baseUrl: "/api/tenant/customers",
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer Name",
        cell: ({ row }) => {
          const name = row.original.name;
          const initials = name
            ? name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "CU";

          const subtitle = row.original.phone || row.original.email || "B2B Customer";

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {initials || <Building2 className="h-4 w-4 text-muted-foreground" />}
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
        accessorKey: "contactPerson",
        header: "Contact Person",
        cell: ({ row }) => {
          const person = row.original.contactPerson;
          const position = row.original.contactPosition;
          if (!person && !position) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{person || "—"}</span>
              {position && <span className="text-xs text-muted-foreground">{position}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "outstandingBalance",
        header: "Outstanding Balance",
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
        header: "Deposit Balance",
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
        header: "Added On",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
    ],
    []
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
      rowHref={(row) => `/admin/customers/${row.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name..."
    />
  );
}
