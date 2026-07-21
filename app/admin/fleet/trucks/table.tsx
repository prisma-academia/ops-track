"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Truck, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export type TruckRow = {
  id: string;
  name: string;
  transporterName: string;
  capacityLiters: number;
  status: string;
  transportCount: number;
  createdAt: string;
};

const columns: ColumnDef<TruckRow>[] = [
  { 
    accessorKey: "name", 
    header: "Truck (Plate / ID)",
    cell: ({ row }) => {
      const name = row.original.name;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <Truck className="w-5 h-5" />
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
    accessorKey: "capacityLiters", 
    header: "Capacity (L)",
    cell: ({ row }) => row.original.capacityLiters.toLocaleString()
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
  {
    id: "actions",
    cell: ({ row }) => {
      const truck = row.original;
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/fleet/trucks/${truck.id}/edit`}>
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      );
    }
  }
];

export function TrucksTable({ data, serverPagination, filterNode }: { data: TruckRow[]; serverPagination?: any; filterNode?: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("take", newSize.toString());
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/trucks/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by plate number or ID…"
      filterNode={filterNode}
      {...(serverPagination ? {
        serverPagination: {
          ...serverPagination,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      } : {})}
    />
  );
}
