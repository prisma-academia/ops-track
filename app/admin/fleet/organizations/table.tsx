"use client";

import { useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  stationsCount: number;
  usersCount: number;
};

export function OrganizationsTable({
  initialData,
  initialMeta,
}: {
  initialData: OrganizationRow[];
  initialMeta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<OrganizationRow>({
    baseUrl: "/api/tenant/organizations",
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const columns = useMemo<ColumnDef<OrganizationRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Organization Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground font-mono">@{row.original.slug}</span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const t = row.original.type;
          return (
            <Badge variant={t === "INTERNAL" ? "default" : "secondary"}>
              {t}
            </Badge>
          );
        },
      },
      {
        id: "stats",
        header: "Metrics",
        cell: ({ row }) => (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{row.original.stationsCount}</span> Stations
            </div>
            <div>
              <span className="font-medium text-foreground">{row.original.usersCount}</span> Users
            </div>
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const active = row.original.isActive;
          return (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm">{active ? "Active" : "Inactive"}</span>
            </div>
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
      rowHref={(row) => `/admin/fleet/organizations/${row.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name..."
    />
  );
}
