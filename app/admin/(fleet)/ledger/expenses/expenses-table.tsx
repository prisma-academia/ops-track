"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables";
import { LedgerReportTable } from "../_components/ledger-report-table";
import type { TableInsightStat } from "@/components/tables";
import type { FilterConfig } from "@/components/data-table-filter-drawer";

export type ExpensesLedgerRow = {
  id: string;
  createdAt: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  transporter?: { name: string };
  truck?: { name: string; plateNumber?: string | null };
  order?: { reference?: string | null };
};

export const expensesColumns: ColumnDef<ExpensesLedgerRow>[] = [
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
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    meta: { label: "Category" },
    cell: ({ row }) => {
      const cat = row.original.category?.replace(/_/g, " ") || "-";
      return <Badge variant="secondary">{cat}</Badge>;
    },
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    meta: { label: "Description" },
    cell: ({ row }) => {
      const desc = row.original.description || "-";
      return (
        <div className="max-w-[240px] truncate text-muted-foreground" title={desc}>
          {desc}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    meta: { label: "Amount" },
    cell: ({ row }) => {
      const amount = Number(row.original.amount);
      return <span className="font-mono font-semibold text-red-600">₦{amount.toLocaleString()}</span>;
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
    id: "associatedTo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Associated To" />,
    meta: { label: "Associated To" },
    accessorFn: (row) =>
      row.transporter?.name || row.truck?.plateNumber || row.truck?.name || "-",
    cell: ({ row }) =>
      row.original.transporter?.name ||
      row.original.truck?.plateNumber ||
      row.original.truck?.name ||
      "-",
  },
  {
    id: "reference",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    meta: { label: "Reference" },
    accessorFn: (row) => row.reference || row.order?.reference || "-",
    cell: ({ row }) => {
      const ref = row.original.reference || row.original.order?.reference || "-";
      return <span className="font-mono text-xs text-muted-foreground">{ref}</span>;
    },
  },
];

interface ExpensesTableProps {
  data: ExpensesLedgerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filters?: FilterConfig[];
  insightStats: TableInsightStat[];
}

export function ExpensesTable({
  data,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  filters,
  insightStats,
}: ExpensesTableProps) {
  return (
    <LedgerReportTable
      tableId="fleet-ledger-expenses"
      data={data}
      columns={expensesColumns}
      searchPlaceholder="Search description, reference..."
      filters={filters}
      insightStats={insightStats}
      breakdownTitle="Expense breakdown"
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={pageSize}
      emptyMessage="No expense records found."
    />
  );
}
