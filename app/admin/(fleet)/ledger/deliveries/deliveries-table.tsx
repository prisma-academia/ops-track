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
  };
};

export const salesColumns: ColumnDef<SalesLedgerRow>[] = [
  {
    id: "clientName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Client / Station" />,
    meta: { label: "Client / Station" },
    enableHiding: false,
    footer: () => "Total",
    accessorFn: (row) =>
      row.delivery?.customer?.name || row.delivery?.station?.name || "-",
    cell: ({ row }) => {
      const name =
        row.original.delivery?.customer?.name || row.original.delivery?.station?.name || "-";
      return <span className="font-medium">{name}</span>;
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
