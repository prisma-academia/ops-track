"use client";

import { ColumnDef } from "@tanstack/react-table";
import { LedgerTableShell } from "../_components/ledger-table-shell";
import { Badge } from "@/components/ui/badge";

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
    accessorKey: "clientName",
    header: "Client / Station Name",
    cell: ({ row }) => {
      const name = row.original.delivery?.customer?.name || row.original.delivery?.station?.name || "-";
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "paymentType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.paymentType?.replace(/_/g, ' ') || "-";
      return <Badge variant="outline">{type}</Badge>;
    },
  },
  {
    accessorKey: "amount",
    header: "Amount (₦)",
    cell: ({ row }) => {
      const amount = Number(row.original.amount);
      return <span className="text-green-600 font-semibold">₦{amount.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => row.original.paymentMethod || "-",
  },
  {
    accessorKey: "saleRef",
    header: "Delivery Ref",
    cell: ({ row }) => {
      const ref = row.original.delivery?.id?.substring(0, 8) || "-";
      return <span className="text-muted-foreground text-xs font-mono">{ref}</span>;
    },
  },
];

interface SalesTableProps {
  data: SalesLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filterNode?: React.ReactNode;
}

export function SalesTable(props: SalesTableProps) {
  return (
    <LedgerTableShell
      title="Client deliveries & Inflows"
      columns={salesColumns}
      {...props}
    />
  );
}
