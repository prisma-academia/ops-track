"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Route } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export type TransportRow = {
  id: string;
  destination: string;
  sourceDepot?: string;
  transporterName: string;
  truckName: string;
  driverName: string;
  orderReference: string;
  isUnlinked?: boolean;
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
      const source = row.original.sourceDepot || "Depot";
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0">
            <Image
              src="/assets/icons/gas-truck.png"
              alt="Transport"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{source} to {dest}</span>
            <span className="text-xs text-muted-foreground">{row.original.truckName} - {row.original.driverName}</span>
          </div>
        </div>
      );
    }
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
      let variant: "default" | "secondary" | "destructive" | "outline" | "warning" = "secondary";
      if (status === "PENDING") variant = "warning";
      if (status === "IN_TRANSIT") variant = "secondary";
      if (status === "COMPLETED") variant = "default";
      if (status === "CANCELLED" || status === "REJECTED") variant = "destructive";
      return (
        <Badge variant={variant === "warning" ? "default" : variant} className={variant === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300" : ""}>
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
    accessorKey: "orderReference",
    header: "Order",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-sm">{row.original.orderReference}</span>
        {row.original.isUnlinked && (
          <Badge variant="outline" className="text-[10px]">Unlinked</Badge>
        )}
      </div>
    ),
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

export function TransportsTable({ data, filterNode, serverPagination }: { data: TransportRow[], filterNode?: React.ReactNode, serverPagination?: any }) {
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
      rowHref={(s) => `/admin/fleet/transports/${s.id}`}
      filterColumnId="destination"
      searchPlaceholder="Search by destination…"
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
