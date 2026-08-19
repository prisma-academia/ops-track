"use client";

import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

export type TenantUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isOwner: boolean;
  status: string;
  lastLoginAt: string | null;
};

const columns: ColumnDef<TenantUserRow>[] = [
  { accessorKey: "email", header: "Email" },
  {
    id: "name",
    header: "Name",
    accessorFn: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
  },
  { accessorKey: "isOwner", header: "Owner", cell: (info) => (info.getValue() ? "yes" : "no") },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "lastLoginAt",
    header: "Last login",
    cell: (info) => {
      const v = info.getValue() as string | null;
      return <span className="text-xs text-stone-500">{v ? new Date(v).toLocaleString() : "—"}</span>;
    },
  },
];

export function TenantUsersTable({ initialData, initialMeta, moduleContext }: { initialData: TenantUserRow[], initialMeta: any, moduleContext: "STATION" | "FLEET" }) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<TenantUserRow>({
    baseUrl: "/api/tenant/users",
    additionalParams: { module: moduleContext },
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
      rowHref={(u) => `/admin/users/${u.id}`}
      filterColumnId="email"
      searchPlaceholder="Search by email…"
    />
  );
}
