"use client";

import { ColumnDef } from "@tanstack/react-table";
import { LedgerTableShell } from "../_components/ledger-table-shell";
import { Badge } from "@/components/ui/badge";

export type ExpensesLedgerRow = {
  id: string;
  createdAt: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  transporter?: { name: string };
  truck?: { name: string };
};

export const expensesColumns: ColumnDef<ExpensesLedgerRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const cat = row.original.category?.replace(/_/g, ' ') || "-";
      return <Badge variant="secondary">{cat}</Badge>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.original.description || "-";
      return <div className="max-w-[200px] truncate" title={desc}>{desc}</div>;
    },
  },
  {
    accessorKey: "amount",
    header: "Amount (₦)",
    cell: ({ row }) => {
      const amount = Number(row.original.amount);
      return <span className="text-red-600 font-semibold">₦{amount.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => row.original.paymentMethod || "-",
  },
  {
    accessorKey: "associatedTo",
    header: "Associated To",
    cell: ({ row }) => row.original.transporter?.name || row.original.truck?.name || "-",
  },
];

interface ExpensesTableProps {
  data: ExpensesLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filterNode?: React.ReactNode;
}

export function ExpensesTable(props: ExpensesTableProps) {
  return (
    <LedgerTableShell
      title="Operational Expenses"
      columns={expensesColumns}
      {...props}
    />
  );
}
