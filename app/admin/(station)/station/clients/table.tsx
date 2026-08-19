"use client";

import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

export type ClientRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
};

const columns: ColumnDef<ClientRow>[] = [
  { accessorKey: "email", header: "Email" },
  {
    id: "name",
    header: "Name",
    accessorFn: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
  },
  { accessorKey: "phone", header: "Phone", cell: (info) => (info.getValue() as string) ?? "—" },
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

export function ClientsTable({ initialData, initialMeta }: { initialData: ClientRow[], initialMeta: any }) {
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
      filterColumnId="email"
      searchPlaceholder="Search by email…"
    />
  );
}
