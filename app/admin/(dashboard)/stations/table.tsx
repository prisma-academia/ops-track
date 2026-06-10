"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import Image from 'next/image';
import logo from '@/assets/logo.png';
import { Store } from "lucide-react";

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
  { 
    accessorKey: "name", 
    header: "Station",
    cell: ({ row }) => {
      const name = row.original.name;
      const code = row.original.code;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary">
            <Image
              src="/assets/icons/gps.png"
              alt="My Image"
              width={500}
              height={300}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground font-mono">{code}</span>
          </div>
        </div>
      );
    }
  },
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
