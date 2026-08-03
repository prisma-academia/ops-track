"use client";

import { ColumnDef } from "@tanstack/react-table";
import { LedgerTableShell } from "../_components/ledger-table-shell";

export type TransportsLedgerRow = {
  id: string;
  createdAt: string;
  transporter?: { name: string };
  driver?: { firstName: string; lastName: string };
  orderId: string;
  totalDeduction: number;
  maintenanceCost: number;
  netTransportFeePaid: number;
};

export const transportsColumns: ColumnDef<TransportsLedgerRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "transporter",
    header: "Transporter",
    cell: ({ row }) => {
      const name = row.original.transporter?.name || "-";
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    accessorKey: "driver",
    header: "Driver",
    cell: ({ row }) => row.original.driver ? `${row.original.driver.firstName} ${row.original.driver.lastName}` : "-",
  },
  {
    accessorKey: "orderRef",
    header: "Order Ref",
    cell: ({ row }) => {
      const ref = row.original.orderId?.substring(0, 8) || "-";
      return <span className="text-muted-foreground text-xs">{ref}</span>;
    },
  },
  {
    accessorKey: "deductions",
    header: "Deductions",
    cell: ({ row }) => {
      const val = Number(row.original.totalDeduction || 0);
      return <span className="text-red-500">₦{val.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "maintenance",
    header: "Maintenance",
    cell: ({ row }) => {
      const val = Number(row.original.maintenanceCost || 0);
      return <span className="text-red-500">₦{val.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "netPaid",
    header: "Net Paid",
    cell: ({ row }) => {
      const val = Number(row.original.netTransportFeePaid || 0);
      return <span className="text-blue-600 font-semibold">₦{val.toLocaleString()}</span>;
    },
  },
];

interface TransportsTableProps {
  data: TransportsLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filterNode?: React.ReactNode;
}

export function TransportsTable(props: TransportsTableProps) {
  return (
    <LedgerTableShell
      title="Transport Operations & Payouts"
      columns={transportsColumns}
      {...props}
    />
  );
}
