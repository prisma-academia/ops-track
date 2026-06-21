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

  tenantDisplay?: string | null;
  actorDisplay?: string | null;
  targetDisplay?: string | null;
};

const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: (info) => <span className="text-xs text-stone-500">{new Date(info.getValue() as string).toLocaleString()}</span>,
  },
  { 
    id: "tenant", 
    header: "Tenant", 
    accessorFn: (r) => r.tenantDisplay ?? r.tenantId ?? "—",
    cell: (info) => info.getValue() as string 
  },
  {
    id: "actor",
    header: "Actor",
    accessorFn: (r) => r.actorDisplay ?? `${r.actorType}:${r.actorId ?? "—"}`,
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
    accessorFn: (r) => r.targetDisplay ?? (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
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
