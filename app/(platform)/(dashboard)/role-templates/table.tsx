"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type RoleRow = {
  id: string;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  createdAt: string;
};

const columns: ColumnDef<RoleRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "permissionCount", header: "# Permissions" },
  { accessorKey: "isSystem", header: "System", cell: (info) => (info.getValue() ? "yes" : "no") },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: (info) => (
      <span className="text-xs text-stone-500">{new Date(info.getValue() as string).toLocaleDateString()}</span>
    ),
  },
];

export function RolesTable({ data }: { data: RoleRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(r) => `/role-templates/${r.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
