"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables";
import { LedgerReportTable } from "../_components/ledger-report-table";
import type { TableInsightStat } from "@/components/tables";
import type { FilterConfig } from "@/components/data-table-filter-drawer";

export type SalesLedgerRow = {
  id: string;
  createdAt: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  saleId: string;
  delivery: {
    id: string;
    customer?: { name: string };
    station?: { name: string };
    transport?: {
      id?: string;
      isOneTime?: boolean | null;
      oneTimeTransporterName?: string | null;
      oneTimeTruckPlate?: string | null;
      oneTimeDriverName?: string | null;
      transporter?: { name: string } | null;
      truck?: { name?: string | null; plateNumber?: string | null } | null;
      driver?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
  };
};

function cleanLedgerValue(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed === "-" ||
    lower === "unknown" ||
    lower === "unknown driver" ||
    lower === "unknown recipient" ||
    lower === "n/a" ||
    lower === "null" ||
    lower === "unassigned" ||
    lower === "unassigned truck" ||
    lower === "unassigned driver"
  ) {
    return null;
  }
  return trimmed;
}

function resolveLedgerTransporter(row: SalesLedgerRow): string {
  const t = row.delivery?.transport;
  const raw = t?.transporter?.name || t?.oneTimeTransporterName;
  return cleanLedgerValue(raw) || "-";
}

function resolveLedgerTruck(row: SalesLedgerRow): string {
  const t = row.delivery?.transport;
  if (!t) return "-";
  const rawPlate =
    cleanLedgerValue(t.truck?.plateNumber) ||
    cleanLedgerValue(t.truck?.name) ||
    cleanLedgerValue(t.oneTimeTruckPlate);

  if (rawPlate) return rawPlate;

  const transporter = cleanLedgerValue(t.transporter?.name || t.oneTimeTransporterName);
  if (transporter) return `Truck (${transporter})`;

  return "-";
}

function resolveLedgerDriver(row: SalesLedgerRow): string {
  const t = row.delivery?.transport;
  if (!t) return "-";
  const d = t.driver;
  const driverFullName = d ? `${d.firstName || ""} ${d.lastName || ""}`.trim() : null;
  const raw = cleanLedgerValue(driverFullName) || cleanLedgerValue(t.oneTimeDriverName);
  return raw || "-";
}

export const salesColumns: ColumnDef<SalesLedgerRow>[] = [
  {
    id: "clientName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Client / Station" />,
    meta: { label: "Client / Station" },
    enableHiding: false,
    footer: () => "Total",
    accessorFn: (row) =>
      cleanLedgerValue(row.delivery?.customer?.name) || cleanLedgerValue(row.delivery?.station?.name) || "-",
    cell: ({ row }) => {
      const name =
        cleanLedgerValue(row.original.delivery?.customer?.name) || cleanLedgerValue(row.original.delivery?.station?.name) || "-";
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    id: "transporter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Transporter" />,
    meta: { label: "Transporter" },
    accessorFn: (row) => resolveLedgerTransporter(row),
    cell: ({ row }) => {
      const val = resolveLedgerTransporter(row.original);
      return <span className="truncate max-w-[130px] inline-block font-medium">{val}</span>;
    },
  },
  {
    id: "truck",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
    meta: { label: "Truck" },
    accessorFn: (row) => resolveLedgerTruck(row),
    cell: ({ row }) => {
      const truck = resolveLedgerTruck(row.original);
      return <span className="font-mono text-xs uppercase">{truck}</span>;
    },
  },
  {
    id: "driver",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Driver" />,
    meta: { label: "Driver" },
    accessorFn: (row) => resolveLedgerDriver(row),
    cell: ({ row }) => {
      const driver = resolveLedgerDriver(row.original);
      return <span className="text-muted-foreground">{driver}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {format(new Date(row.original.createdAt), "LLL dd, y")}
      </span>
    ),
  },
  {
    accessorKey: "paymentType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    meta: { label: "Type" },
    cell: ({ row }) => {
      const type = row.original.paymentType?.replace(/_/g, " ") || "-";
      return <Badge variant="outline">{type}</Badge>;
    },
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    meta: { label: "Amount" },
    cell: ({ row }) => {
      const amount = Number(row.original.amount);
      return <span className="font-mono font-semibold text-green-600">₦{amount.toLocaleString()}</span>;
    },
    footer: ({ table }) =>
      `₦${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + Number(row.original.amount), 0)
        .toLocaleString()}`,
  },
  {
    accessorKey: "paymentMethod",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    meta: { label: "Method" },
    cell: ({ row }) => row.original.paymentMethod?.replace(/_/g, " ") || "-",
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "saleRef",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Ref" />,
    meta: { label: "Delivery Ref" },
    accessorFn: (row) => row.delivery?.id?.substring(0, 8) || "-",
    cell: ({ row }) => {
      const ref = row.original.delivery?.id?.substring(0, 8) || "-";
      return <span className="font-mono text-xs text-muted-foreground">{ref}</span>;
    },
  },
];

interface SalesTableProps {
  data: SalesLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filters?: FilterConfig[];
  insightStats: TableInsightStat[];
}

export function SalesTable(props: SalesTableProps) {
  return (
    <LedgerReportTable
      tableId="fleet-ledger-deliveries"
      data={props.data}
      columns={salesColumns}
      searchPlaceholder="Search client, station, method..."
      filters={props.filters}
      insightStats={props.insightStats}
      breakdownTitle="Inflow breakdown"
      totalCount={props.totalCount}
      totalPages={props.totalPages}
      currentPage={props.currentPage}
      pageSize={props.pageSize}
      emptyMessage="No delivery payment records found."
    />
  );
}
