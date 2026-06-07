"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  companyEmail: string | null;
  createdAt: string;
};

const columns: ColumnDef<TenantRow>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
  },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "companyEmail", header: "Email", cell: (info) => (info.getValue() as string) ?? "—" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: (info) => (
      <span className="text-xs text-stone-500">{new Date(info.getValue() as string).toLocaleDateString()}</span>
    ),
  },
];

export function TenantsTable({ data }: { data: TenantRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(t) => `/tenants/${t.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
