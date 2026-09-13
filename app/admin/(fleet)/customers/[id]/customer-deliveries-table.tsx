"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, type DataTableFilterField } from "@/components/tables";
import { Truck, Printer } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CustomerDeliveryRow = {
  id: string;
  truckId?: string | null;
  truckName: string;
  truckPlate: string;
  truckBrand?: string | null;
  driverName?: string | null;
  stationName: string;
  stationCode: string;
  productType?: string | null;
  litersDespatched: number;
  litersReceived: number | null;
  totalExpectedAmount: number;
  paymentReceived: number;
  balance: number;
  status: string;
  createdAt: string;
};

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const filterFields: DataTableFilterField<CustomerDeliveryRow>[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { label: "Cleared", value: "CLEARED" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Part Paid", value: "PART_PAID" },
      { label: "Unpaid", value: "UNPAID" },
      { label: "Pending", value: "PENDING" },
    ],
  },
];

export function CustomerDeliveriesTable({
  data,
  customerId,
  rowHref,
}: {
  data: CustomerDeliveryRow[];
  customerId?: string;
  rowHref?: (row: CustomerDeliveryRow) => string | null | undefined;
}) {
  const columns = useMemo<ColumnDef<CustomerDeliveryRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return (
            <div className="flex flex-col">
              <span className="text-foreground text-xs font-medium">{format(date, "MMM d, yyyy")}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(date, { addSuffix: true })}
              </span>
            </div>
          );
        },
        footer: () => <span className="font-semibold text-xs">Total</span>,
      },
      {
        accessorKey: "truckName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivering Truck" />,
        cell: ({ row }) => {
          const truckName = row.original.truckName;
          const plate = row.original.truckPlate;
          const driver = row.original.driverName;

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  <Truck className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-foreground text-xs">{truckName}</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {plate !== "—" ? plate : "Direct Delivery"}
                  {driver && plate !== "—" ? ` • ${driver}` : ""}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "litersDespatched",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Liters" />,
        cell: ({ row }) => (
          <span className="font-mono font-medium text-foreground text-xs">
            {row.original.litersDespatched.toLocaleString()} L
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.litersDespatched || 0), 0);
          return <span className="font-mono text-xs font-semibold">{total.toLocaleString()} L</span>;
        },
      },
      {
        accessorKey: "totalExpectedAmount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Amount" />,
        cell: ({ row }) => (
          <span className="font-mono text-foreground text-xs">
            {formatNaira(row.original.totalExpectedAmount)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.totalExpectedAmount || 0), 0);
          return <span className="font-mono text-xs font-semibold">{formatNaira(total)}</span>;
        },
      },
      {
        accessorKey: "paymentReceived",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" />,
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono text-xs",
              row.original.paymentReceived > 0
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {formatNaira(row.original.paymentReceived)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.paymentReceived || 0), 0);
          return (
            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNaira(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "balance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
        cell: ({ row }) => {
          const bal = row.original.balance;
          return (
            <span
              className={cn(
                "font-mono text-xs",
                bal > 0
                  ? "font-medium text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
              )}
            >
              {formatNaira(bal)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.balance || 0), 0);
          return (
            <span
              className={cn(
                "font-mono text-xs font-semibold",
                total > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
              )}
            >
              {formatNaira(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wider font-semibold",
                (status === "CLEARED" || status === "COMPLETED") &&
                  "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
                status === "PART_PAID" &&
                  "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
                (status === "UNPAID" || status === "PENDING") &&
                  "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
              )}
            >
              {status?.replace(/_/g, " ") || "—"}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "actions",
        header: () => <span className="text-right block pr-2">Actions</span>,
        cell: ({ row }) => {
          const invoiceHref = customerId
            ? `/admin/customers/${customerId}/invoice/${row.original.id}`
            : `/admin/deliveries/${row.original.id}/print`;
          return (
            <div className="flex items-center justify-end gap-1.5 pr-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                asChild
                title="Print Delivery Invoice"
              >
                <Link href={invoiceHref}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  <span>Print</span>
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [customerId]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="customer-recent-deliveries"
      searchPlaceholder="Search deliveries..."
      filterFields={filterFields}
      emptyMessage="No deliveries recorded for this customer yet."
      pageSize={10}
      hideDateFilter
      rowHref={rowHref || ((row) => `/admin/deliveries/${row.id}`)}
    />
  );
}
