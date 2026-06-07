"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type ActivityRow = {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  createdAt: string;
};

const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: (info) => <span className="text-xs text-stone-500">{new Date(info.getValue() as string).toLocaleString()}</span>,
  },
  { accessorKey: "tenantId", header: "Tenant", cell: (info) => (info.getValue() as string) ?? "—" },
  {
    id: "actor",
    header: "Actor",
    accessorFn: (r) => `${r.actorType}:${r.actorId ?? "—"}`,
    cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
  },
  {
    id: "target",
    header: "Target",
    accessorFn: (r) => (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
    cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
  },
  { accessorKey: "ip", header: "IP", cell: (info) => (info.getValue() as string) ?? "—" },
];

export function ActivityTable({ data }: { data: ActivityRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumnId="action"
      searchPlaceholder="Search by action…"
    />
  );
}
