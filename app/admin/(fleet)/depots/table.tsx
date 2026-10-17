"use client";

import { useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Fuel } from "lucide-react";

export type DepotRow = {
  id: string;
  name: string;
  country?: string | null;
  state?: string | null;
  lga?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
};

export function DepotsTable({
  initialData,
  initialMeta,
}: {
  initialData: DepotRow[];
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
    usePaginatedQuery<DepotRow>({
      baseUrl: "/api/tenant/depots",
    });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const columns = useMemo<ColumnDef<DepotRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Depot",
        cell: ({ row }) => {
          const name = row.original.name;
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          const subtitle = [row.original.state, row.original.lga].filter(Boolean).join(", ") || "Fuel depot";

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {initials || <Fuel className="h-4 w-4 text-muted-foreground" />}
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
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.country || "—"}</span>
        ),
      },
      {
        id: "coordinates",
        header: "Coordinates",
        cell: ({ row }) => {
          const { latitude, longitude } = row.original;
          if (latitude == null || longitude == null) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
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
      rowHref={(row) => `/admin/depots/${row.id}`}
      filterColumnId="name"
      searchPlaceholder="Search depots..."
    />
  );
}
