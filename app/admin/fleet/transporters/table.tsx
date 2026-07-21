"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Building2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export type TransporterRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  truckCount: number;
  driverCount: number;
  createdAt: string;
};

const columns: ColumnDef<TransporterRow>[] = [
  { 
    accessorKey: "name", 
    header: "Company",
    cell: ({ row }) => {
      const name = row.original.name;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
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
    accessorKey: "truckCount", 
    header: "Trucks",
    cell: ({ row }) => row.original.truckCount
  },
  { 
    accessorKey: "driverCount", 
    header: "Drivers",
    cell: ({ row }) => row.original.driverCount
  },
  { 
    accessorKey: "createdAt", 
    header: "Joined",
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
      const transporter = row.original;
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/fleet/transporters/${transporter.id}/edit`}>
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      );
    }
  }
];

export function TransportersTable({ data, serverPagination, filterNode }: { data: TransporterRow[]; serverPagination?: any; filterNode?: React.ReactNode }) {
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
      rowHref={(s) => `/admin/fleet/transporters/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
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
