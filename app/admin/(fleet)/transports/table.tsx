"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { formatDestination } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  TransportSalesLossBadges,
  TransportStatusBadge,
  type TransportLossBreakdownItem,
} from "@/components/fleet/transport-sales-loss-badges";

export type TransportRow = {
  id: string;
  destination: string;
  sourceDepot?: string;
  transporterName: string;
  truckName: string;
  driverName?: string | null;
  orderReference: string;
  isUnlinked?: boolean;
  status: string;
  productType: string;
  salesCount: number;
  litersSold: number;
  litersLost: number;
  lossBreakdown: TransportLossBreakdownItem[];
  pendingDeliveries: number;
  litersCarried: number;
  createdAt: string;
};

const columns: ColumnDef<TransportRow>[] = [
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => {
      const rawDestination = row.original.destination;
      const dest = formatDestination(rawDestination);
      const source = row.original.sourceDepot || "Depot";
      const isPrimary = /\(\s*primary\s+destination\s*\)/i.test(rawDestination || "");
      const routeLabel = `${source} to ${dest}${isPrimary ? " (Primary)" : ""}`;

      const transporter = row.original.transporterName?.trim();
      const hasValidTransporter =
        transporter &&
        transporter.toLowerCase() !== "unknown" &&
        transporter.toLowerCase() !== "unassigned";
      const title = hasValidTransporter ? transporter : "Unassigned Transporter";

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
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground truncate">{title}</span>
            <span className="text-xs text-muted-foreground truncate">{routeLabel}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "litersCarried",
    header: "Volume (L)",
    cell: ({ row }) => row.original.litersCarried.toLocaleString(),
  },
  {
    id: "salesLoss",
    header: "Sales & loss",
    cell: ({ row }) => (
      <TransportSalesLossBadges
        summary={{
          status: row.original.status,
          litersSold: row.original.litersSold,
          litersLost: row.original.litersLost,
          lossBreakdown: row.original.lossBreakdown,
          pendingDeliveries: row.original.pendingDeliveries,
        }}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <TransportStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "productType",
    header: "Product",
    cell: ({ row }) => {
      const pType = row.original.productType;
      return (
        <Badge variant={pType && pType !== "-" ? "outline" : "default"}>
          {pType && pType !== "-" ? pType : "N/A"}
        </Badge>
      );
    },
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
    },
  },
];

export function TransportsTable({
  data,
  filterNode,
  serverPagination,
}: {
  data: TransportRow[];
  filterNode?: React.ReactNode;
  serverPagination?: any;
}) {
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
    <TooltipProvider delayDuration={200}>
      <DataTable
        columns={columns}
        data={data}
        rowHref={(s) => `/admin/transports/${s.id}`}
        filterColumnId="destination"
        searchPlaceholder="Search by destination…"
        filterNode={filterNode}
        {...(serverPagination
          ? {
              serverPagination: {
                ...serverPagination,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
              },
            }
          : {})}
      />
    </TooltipProvider>
  );
}
