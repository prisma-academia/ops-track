"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

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

export function ClientsTable({ data }: { data: ClientRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(c) => `/admin/clients/${c.id}`}
      filterColumnId="email"
      searchPlaceholder="Search by email…"
    />
  );
}
