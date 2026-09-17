"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DemoRequestRow = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  interestedIn: string[];
  country: string | null;
  status: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:     "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CONTACTED:   "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  NEGOTIATING: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  CONVERTED:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LOST:        "border-border/60 text-muted-foreground",
};

const columns: ColumnDef<DemoRequestRow>[] = [
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.companyName}</p>
        <p className="text-xs text-muted-foreground">{row.original.contactName}</p>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() as string}</span>,
  },
  {
    accessorKey: "interestedIn",
    header: "Interested In",
    cell: ({ row }) => (
      <div className="flex gap-1 flex-wrap">
        {row.original.interestedIn.map((m) => (
          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: (info) => <span className="text-sm text-muted-foreground">{(info.getValue() as string) ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className={cn("text-xs font-medium", STATUS_STYLES[row.original.status] ?? "")}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Received",
    cell: (info) => (
      <span className="text-xs text-muted-foreground">
        {new Date(info.getValue() as string).toLocaleDateString()}
      </span>
    ),
  },
];

export function DemoRequestsTable({ data }: { data: DemoRequestRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(r) => `/demo-requests/${r.id}`}
      filterColumnId="companyName"
      searchPlaceholder="Search by company…"
    />
  );
}