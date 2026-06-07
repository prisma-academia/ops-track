"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

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

export function TenantUsersTable({ data }: { data: TenantUserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(u) => `/admin/users/${u.id}`}
      filterColumnId="email"
      searchPlaceholder="Search by email…"
    />
  );
}
