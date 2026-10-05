"use client";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Car, Fuel, Users } from "lucide-react";
import { useEffect } from "react";

export type ClientRow = {
  id: string;
  email: string;
  companyName: string | null;
  contactPerson: string | null;
  phone: string | null;
  status: string;
  billingModel: "PREPAID" | "POSTPAID";
  depositBalance: number;
  outstandingDebt: number;
  creditLimit: number;
  createdAt: string;
  allowedStationsCount: number;
  vehiclesCount: number;
  driversCount: number;
  ordersCount: number;
};

const columns: ColumnDef<ClientRow>[] = [
  {
    id: "company",
    header: "Organization / Client",
    accessorFn: (r) => r.companyName || r.email,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{c.companyName || "Unnamed Organization"}</span>
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">{c.email}</span>
          {(c.contactPerson || c.phone) && (
            <span className="mt-1 text-xs text-muted-foreground">
              {[c.contactPerson, c.phone].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "billingModel",
    header: "Model",
    cell: ({ row }) => {
      const model = row.original.billingModel;
      return (
        <Badge variant={model === "PREPAID" ? "default" : "secondary"}>
          {model}
        </Badge>
      );
    },
  },
  {
    id: "balance",
    header: "Balance / Limit",
    cell: ({ row }) => {
      const c = row.original;
      if (c.billingModel === "PREPAID") {
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-primary">
              ₦{c.depositBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted-foreground">Prepaid Deposit</span>
          </div>
        );
      }
      return (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-destructive">
            Debt: ₦{c.outstandingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Limit: ₦{c.creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      );
    },
  },
  {
    id: "fleet",
    header: "Fleet & Drivers",
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Registered Vehicles">
            <Car className="size-3 text-primary" />
            {c.vehiclesCount}
          </span>
          <span className="flex items-center gap-1" title="Authorized Drivers">
            <Users className="size-3 text-primary" />
            {c.driversCount}
          </span>
          <span className="flex items-center gap-1" title="Fuel Orders">
            <Fuel className="size-3 text-primary" />
            {c.ordersCount}
          </span>
        </div>
      );
    },
  },
  {
    id: "stations",
    header: "Allowed Branches",
    cell: ({ row }) => {
      const count = row.original.allowedStationsCount;
      return (
        <span className="text-xs font-medium text-foreground">
          {count > 0 ? `${count} ${count === 1 ? "Station" : "Stations"}` : "None"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
];

export function ClientsTable({
  initialData,
  initialMeta,
}: {
  initialData: ClientRow[];
  initialMeta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<ClientRow>({
    baseUrl: "/api/tenant/clients",
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

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
      rowHref={(c) => `/admin/station/clients/${c.id}`}
      filterColumnId="company"
      searchPlaceholder="Search clients by name or email…"
    />
  );
}
