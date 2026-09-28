"use client";

import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Badge } from "@/components/ui/badge";
import { Building2, Car, Users, Fuel } from "lucide-react";

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
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="size-3.5 text-primary shrink-0" />
            {c.companyName || "Unnamed Organization"}
          </span>
          <span className="text-xs text-muted-foreground">{c.email}</span>
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
        <Badge
          variant={model === "PREPAID" ? "default" : "secondary"}
          className={
            model === "PREPAID"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
          }
        >
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
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              ₦{c.depositBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted-foreground">Prepaid Deposit</span>
          </div>
        );
      }
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono">
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
            <Car className="size-3 text-primary/70" />
            {c.vehiclesCount}
          </span>
          <span className="flex items-center gap-1" title="Authorized Drivers">
            <Users className="size-3 text-primary/70" />
            {c.driversCount}
          </span>
          <span className="flex items-center gap-1" title="Fuel Orders">
            <Fuel className="size-3 text-primary/70" />
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
        <Badge
          variant="outline"
          className={
            status === "ACTIVE"
              ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
              : "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30"
          }
        >
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
  initialMeta: any;
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
