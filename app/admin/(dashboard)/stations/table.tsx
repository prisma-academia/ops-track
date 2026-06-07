"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type StationRow = {
  id: string;
  code: string;
  name: string;
  region: string;
  location: string | null;
  staffCount: number;
  tanksCount: number;
  pumpsCount: number;
  ticketsCount: number;
};

const columns: ColumnDef<StationRow>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "region", header: "Region" },
  { accessorKey: "location", header: "Location", cell: (info) => (info.getValue() as string) ?? "—" },
  { accessorKey: "staffCount", header: "Staff" },
  { accessorKey: "tanksCount", header: "Tanks" },
  { accessorKey: "pumpsCount", header: "Pumps" },
  { accessorKey: "ticketsCount", header: "Open Tickets" },
];

export function StationsTable({ data }: { data: StationRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/stations/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
