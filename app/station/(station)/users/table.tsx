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
  organization?: { name: string | null } | null;
  ownedOrganizations?: { name: string | null }[] | null;
};

const columns: ColumnDef<TenantUserRow>[] = [
  { accessorKey: "email", header: "Email" },
  {
    id: "name",
    header: "Name",
    accessorFn: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
  },
  {
    id: "organization",
    header: "Organization",
    cell: ({ row }) => {
      const u = row.original;
      const orgName = u.organization?.name || u.ownedOrganizations?.[0]?.name || "Internal / Fleet";
      return <span className="text-xs font-medium">{orgName}</span>;
    },
  },
  {
    accessorKey: "isOwner",
    header: "Owner",
    cell: ({ row }) => {
      const u = row.original;
      const isOrgOwner = u.isOwner || (u.ownedOrganizations && u.ownedOrganizations.length > 0);
      return isOrgOwner ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 uppercase">
          Owner
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Staff</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {status}
        </span>
      );
    },
  },
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
