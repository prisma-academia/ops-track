"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables";
import { LedgerReportTable } from "../_components/ledger-report-table";
import type { TableInsightStat } from "@/components/tables";
import type { FilterConfig } from "@/components/data-table-filter-drawer";

export type TransportsLedgerRow = {
  id: string;
  createdAt: string;
  status: string;
  transporter?: { name: string };
  driver?: { firstName: string; lastName: string };
  truck?: { name: string; plateNumber?: string | null };
  orderId: string;
  order?: { reference?: string | null };
  ratePerLiter: number;
  litersCarried: number;
  totalDeduction: number;
  maintenanceCost: number;
  netTransportFeePaid: number;
};

export const transportsColumns: ColumnDef<TransportsLedgerRow>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    meta: { label: "Date" },
    enableHiding: false,
    footer: () => "Total",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {format(new Date(row.original.createdAt), "LLL dd, y")}
      </span>
    ),
  },
  {
    id: "transporter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Transporter" />,
    meta: { label: "Transporter" },
    accessorFn: (row) => row.transporter?.name || "-",
    cell: ({ row }) => <span className="font-medium">{row.original.transporter?.name || "-"}</span>,
  },
  {
    id: "truck",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
    meta: { label: "Truck" },
    accessorFn: (row) => row.truck?.plateNumber || row.truck?.name || "-",
    cell: ({ row }) => row.original.truck?.plateNumber || row.original.truck?.name || "-",
  },
  {
    id: "driver",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Driver" />,
    meta: { label: "Driver" },
    accessorFn: (row) =>
      row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "-",
    cell: ({ row }) =>
      row.original.driver
        ? `${row.original.driver.firstName} ${row.original.driver.lastName}`
        : "-",
  },
  {
    id: "orderRef",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order Ref" />,
    meta: { label: "Order Ref" },
    accessorFn: (row) => row.order?.reference || row.orderId?.substring(0, 8) || "-",
    cell: ({ row }) => {
      const ref = row.original.order?.reference || row.original.orderId?.substring(0, 8) || "-";
      return <span className="font-mono text-xs text-muted-foreground">{ref}</span>;
    },
  },
  {
    accessorKey: "litersCarried",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Liters Carried" />,
    meta: { label: "Liters Carried" },
    cell: ({ row }) => <span className="font-mono">{Number(row.original.litersCarried || 0).toLocaleString()} L</span>,
    footer: ({ table }) =>
      `${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + Number(row.original.litersCarried || 0), 0)
        .toLocaleString()} L`,
  },
  {
    accessorKey: "ratePerLiter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rate/L" />,
    meta: { label: "Rate/L" },
    cell: ({ row }) => (
      <span className="font-mono">₦{Number(row.original.ratePerLiter || 0).toLocaleString()}</span>
    ),
  },
  {
    id: "deductions",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Deductions" />,
    meta: { label: "Deductions" },
    accessorFn: (row) => row.totalDeduction,
    cell: ({ row }) => (
      <span className="font-mono text-red-500">
        ₦{Number(row.original.totalDeduction || 0).toLocaleString()}
      </span>
    ),
    footer: ({ table }) =>
      `₦${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + Number(row.original.totalDeduction || 0), 0)
        .toLocaleString()}`,
  },
  {
    id: "maintenance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Maintenance" />,
    meta: { label: "Maintenance" },
    accessorFn: (row) => row.maintenanceCost,
    cell: ({ row }) => (
      <span className="font-mono text-red-500">
        ₦{Number(row.original.maintenanceCost || 0).toLocaleString()}
      </span>
    ),
    footer: ({ table }) =>
      `₦${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + Number(row.original.maintenanceCost || 0), 0)
        .toLocaleString()}`,
  },
  {
    accessorKey: "netTransportFeePaid",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Net Paid" />,
    meta: { label: "Net Paid" },
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-blue-600">
        ₦{Number(row.original.netTransportFeePaid || 0).toLocaleString()}
      </span>
    ),
    footer: ({ table }) =>
      `₦${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + Number(row.original.netTransportFeePaid || 0), 0)
        .toLocaleString()}`,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
        {row.original.status?.replace(/_/g, " ") || "-"}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
];

interface TransportsTableProps {
  data: TransportsLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filters?: FilterConfig[];
  insightStats: TableInsightStat[];
}

export function TransportsTable(props: TransportsTableProps) {
  return (
    <LedgerReportTable
      tableId="fleet-ledger-transports"
      data={props.data}
      columns={transportsColumns}
      searchPlaceholder="Search transporter, driver, order..."
      filters={props.filters}
      insightStats={props.insightStats}
      breakdownTitle="Transport payout mix"
      totalCount={props.totalCount}
      totalPages={props.totalPages}
      currentPage={props.currentPage}
      pageSize={props.pageSize}
      emptyMessage="No transport records found."
    />
  );
}
