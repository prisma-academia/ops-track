"use client";

import { useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDestination } from "@/lib/utils";
import { formatTransportStatusLabel } from "@/lib/fleet/transport-loss";
import { feeLegStatusBadge } from "@/components/fleet/transport-fee-breakdown";
import {
  getFeeLegBreakdown,
  type TransportFeeDelivery,
  type TransportFeeTransaction,
  type TransportFeeTransport,
} from "@/lib/fleet/transport-fees";

type DispatchTransport = TransportFeeTransport & {
  status: string;
  createdAt: string | Date;
  truck?: { plateNumber?: string | null; name?: string | null } | null;
  transporter?: { name?: string | null } | null;
  deliveries?: TransportFeeDelivery[];
  transactions?: TransportFeeTransaction[];
};

export type SubsequentDestinationRow = {
  id: string;
  route: string;
  recipient: string;
  liters: number;
  fee: number;
  feeStatus: "unpaid" | "partial" | "paid" | "not_applicable";
  deliveryId?: string;
};

export type OrderDispatchTableRow = {
  id: string;
  truckLabel: string;
  transporterName: string;
  routeLabel: string;
  litersCarried: number;
  status: string;
  createdAt: string;
  subsequent: SubsequentDestinationRow[];
};

function formatLiters(value: number) {
  return `${value.toLocaleString()} L`;
}

function formatFee(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function transportStatusClass(status: string) {
  if (status === "COMPLETED") return "text-emerald-700 dark:text-emerald-400";
  if (status === "IN_TRANSIT") return "text-indigo-700 dark:text-indigo-400";
  if (status === "LOSS") return "text-rose-700 dark:text-rose-400";
  if (status === "CANCELLED") return "text-muted-foreground";
  return "text-foreground";
}

function buildDispatchRows(
  transports: DispatchTransport[],
  sourceDepot: string | null | undefined,
  originToDepotFee: number
): OrderDispatchTableRow[] {
  return transports.map((transport) => {
    const feeTransactions = (transport.transactions || []).filter(
      (txn) => txn.category === "TRANSPORT_PAYMENT"
    );
    const breakdown = getFeeLegBreakdown(transport, feeTransactions, { originToDepotFee });
    const subsequentFeeRows = breakdown.filter(
      (row) => row.feeLeg === "PRIMARY_TO_SUBSEQUENT" && row.expected > 0
    );
    const deliveries = transport.deliveries || [];
    const primaryDest = formatDestination(transport.destination || "Primary");

    let subsequent: SubsequentDestinationRow[] = subsequentFeeRows.map((row) => {
      const delivery = deliveries.find((d) => d.id === row.deliveryId);
      const liters =
        delivery?.litersReceived != null
          ? Number(delivery.litersReceived)
          : Number(delivery?.litersDespatched || 0);
      const recipient =
        delivery?.station?.name || delivery?.customer?.name || row.label;

      return {
        id: `${transport.id}-${row.deliveryId ?? row.label}`,
        route: `${primaryDest} → ${row.label}`,
        recipient,
        liters,
        fee: row.expected,
        feeStatus: row.status,
        deliveryId: row.deliveryId,
      };
    });

    if (subsequent.length === 0 && deliveries.length > 1) {
      subsequent = deliveries.slice(1).map((delivery) => {
        const recipient =
          delivery.station?.name || delivery.customer?.name || "Secondary stop";
        const liters =
          delivery.litersReceived != null
            ? Number(delivery.litersReceived)
            : Number(delivery.litersDespatched || 0);
        const fee =
          Number(delivery.transportCost || 0) ||
          Number(delivery.transportRate || 0) * liters;

        return {
          id: `${transport.id}-${delivery.id}`,
          route: `${primaryDest} → ${recipient}`,
          recipient,
          liters,
          fee,
          feeStatus: "not_applicable" as const,
          deliveryId: delivery.id,
        };
      });
    }

    const depot = sourceDepot?.trim() || "Depot";

    return {
      id: transport.id,
      truckLabel:
        transport.truck?.plateNumber || transport.truck?.name || "Unknown truck",
      transporterName: transport.transporter?.name || "Unassigned",
      routeLabel: `${depot} → ${primaryDest}`,
      litersCarried: Number(transport.litersCarried) || 0,
      status: transport.status,
      createdAt: new Date(transport.createdAt).toISOString(),
      subsequent,
    };
  });
}

function SubsequentDestinationsPanel({
  rows,
  transportId,
}: {
  rows: SubsequentDestinationRow[];
  transportId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-4 text-xs text-muted-foreground bg-muted/5 border-b">
        No subsequent destinations from the primary stop.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 bg-muted/5 border-b">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Subsequent destinations
      </p>
      <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Recipient</TableHead>
              <TableHead className="text-xs">Route</TableHead>
              <TableHead className="text-xs text-right">Volume</TableHead>
              <TableHead className="text-xs text-right">Transport fee</TableHead>
              <TableHead className="text-xs text-right">Fee status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="text-sm">
                <TableCell className="font-medium">{row.recipient}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={row.route}>
                  {row.route}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatLiters(row.liters)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatFee(row.fee)}
                </TableCell>
                <TableCell className="text-right">{feeLegStatusBadge(row.feeStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/transports/${transportId}`}>Open transport</Link>
        </Button>
      </div>
    </div>
  );
}

export function OrderDispatchedTransportsTable({
  transports,
  sourceDepot,
  originToDepotFee = 0,
}: {
  transports: DispatchTransport[];
  sourceDepot?: string | null;
  originToDepotFee?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () => buildDispatchRows(transports, sourceDepot, originToDepotFee),
    [transports, sourceDepot, originToDepotFee]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const columns = useMemo<ColumnDef<OrderDispatchTableRow>[]>(
    () => [
      {
        accessorKey: "truckLabel",
        header: "Transport",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-3 py-0.5 min-w-0 max-w-[240px]">
              <div className="size-9 flex items-center justify-center shrink-0">
                <Image
                  src="/assets/icons/gas-truck.png"
                  alt=""
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground truncate" title={r.truckLabel}>
                  {r.truckLabel}
                </span>
                <span className="text-xs text-muted-foreground truncate" title={r.transporterName}>
                  {r.transporterName}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "routeLabel",
        header: "Route",
        cell: ({ row }) => (
          <span className="text-sm text-foreground max-w-[200px] truncate block" title={row.original.routeLabel}>
            {row.original.routeLabel}
          </span>
        ),
      },
      {
        accessorKey: "litersCarried",
        header: "Volume",
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm">
            {formatLiters(row.original.litersCarried)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-[11px] font-semibold capitalize",
              transportStatusClass(row.original.status)
            )}
          >
            {formatTransportStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Dispatched",
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return (
            <div className="flex flex-col">
              <span className="text-sm">{date.toLocaleDateString()}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(date, { addSuffix: true })}
              </span>
            </div>
          );
        },
      },
      {
        id: "subsequent",
        header: "Stops",
        cell: ({ row }) => {
          const count = row.original.subsequent.length;
          if (count === 0) {
            return <span className="text-xs text-muted-foreground">Primary only</span>;
          }
          return (
            <Badge variant="outline" className="text-[10px] font-medium">
              +{count} subsequent
            </Badge>
          );
        },
      },
      {
        id: "expand",
        header: "",
        cell: ({ row }) => {
          if (row.original.subsequent.length === 0) return null;
          const open = expandedIds[row.original.id];
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(row.original.id);
              }}
              aria-label={open ? "Collapse destinations" : "Expand destinations"}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
              />
            </Button>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [expandedIds, toggleExpanded]
  );

  const renderSubRow = useCallback(
    (row: OrderDispatchTableRow) => {
      if (!expandedIds[row.id]) return null;
      return (
        <SubsequentDestinationsPanel rows={row.subsequent} transportId={row.id} />
      );
    },
    [expandedIds]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowHref={(row) => `/admin/transports/${row.id}`}
      getRowClassName={(row) => (expandedIds[row.id] ? "bg-muted/10" : "")}
      renderSubRow={renderSubRow}
      pageSize={10}
      empty="No trucks assigned to this order yet."
    />
  );
}
