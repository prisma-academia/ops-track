"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export type DriverRow = {
  id: string;
  name: string;
  transporterName: string;
  phone: string;
  licenseNumber: string;
  status: string;
  transportCount: number;
  createdAt: string;
};

const columns: ColumnDef<DriverRow>[] = [
  { 
    accessorKey: "name", 
    header: "Driver Name",
    cell: ({ row }) => {
      const name = row.original.name;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{row.original.transporterName}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "phone", 
    header: "Phone",
    cell: ({ row }) => row.original.phone
  },
  { 
    accessorKey: "licenseNumber", 
    header: "License No.",
    cell: ({ row }) => row.original.licenseNumber
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "transportCount", 
    header: "Trips",
    cell: ({ row }) => row.original.transportCount
  },
  { 
    accessorKey: "createdAt", 
    header: "Added",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    }
  },
];

export function DriversTable({ data }: { data: DriverRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/drivers/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
