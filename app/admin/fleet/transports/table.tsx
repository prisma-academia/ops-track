"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Route } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export type TransportRow = {
  id: string;
  destination: string;
  transporterName: string;
  truckName: string;
  driverName: string;
  orderReference: string;
  status: string;
  productType: string;
  salesCount: number;
  litersCarried: number;
  createdAt: string;
};

const columns: ColumnDef<TransportRow>[] = [
  { 
    accessorKey: "destination", 
    header: "Destination",
    cell: ({ row }) => {
      const dest = row.original.destination;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <Route className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{dest}</span>
            <span className="text-xs text-muted-foreground">{row.original.truckName} - {row.original.transporterName}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "driverName", 
    header: "Driver",
    cell: ({ row }) => row.original.driverName
  },
  { 
    accessorKey: "litersCarried", 
    header: "Volume (L)",
    cell: ({ row }) => row.original.litersCarried.toLocaleString()
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === "IN_TRANSIT") variant = "secondary";
      if (status === "COMPLETED") variant = "default";
      if (status === "CANCELLED") variant = "destructive";
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "productType", 
    header: "Product",
    cell: ({ row }) => {
      const pType = row.original.productType;
      return (
        <Badge variant={pType ? "outline" : "default"}>
          {pType || "N/A"}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "salesCount", 
    header: "Sales Logged",
    cell: ({ row }) => row.original.salesCount
  },
  { 
    accessorKey: "createdAt", 
    header: "Date",
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

export function TransportsTable({ data }: { data: TransportRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/transports/${s.id}`}
      filterColumnId="destination"
      searchPlaceholder="Search by destination…"
    />
  );
}
