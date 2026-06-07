"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type PlatformUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
};

const columns: ColumnDef<PlatformUserRow>[] = [
  { accessorKey: "email", header: "Email" },
  {
    id: "name",
    header: "Name",
    accessorFn: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
  },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "isSuperAdmin",
    header: "Super admin",
    cell: (info) => (info.getValue() ? "yes" : "no"),
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

export function UsersTable({ data }: { data: PlatformUserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(u) => `/users/${u.id}`}
      filterColumnId="email"
      searchPlaceholder="Search by email…"
    />
  );
}
