"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables";
import { cn } from "@/lib/utils";

export interface FleetPnlTableRow {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  totalDepotToPrimaryCost?: number;
  totalDeliveryTransportCost?: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalLossDeduction: number;
  totalCost: number;
  totalAmountSoldQty: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
  truckIds: string[];
  truckLabels: string[];
  litersDespatched?: number;
  litersReceived?: number | null;
  purchaseCost?: number;
  purchasePricePerLitre?: number;
  loadingCost?: number;
  sellingPrice?: number;
  depotToPrimaryCost?: number;
  deliveryTransportCost?: number;
}

export function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getFleetPnlColumns(): ColumnDef<FleetPnlTableRow>[] {
  return [
    {
      accessorKey: "orderDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      meta: { label: "Date" },
      enableHiding: false,
      footer: () => "Total",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.orderDate), "LLL dd, y")}
        </span>
      ),
    },
    {
      accessorKey: "orderReference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      meta: { label: "Order" },
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span>{row.original.orderReference}</span>
        </div>
      ),
    },
    {
      accessorKey: "productType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      meta: { label: "Product" },
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
          {row.original.productType}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!Array.isArray(value)) return true;
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "trucks",
      accessorFn: (row) => row.truckLabels.join(", "),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Truck(s)" />,
      meta: { label: "Truck(s)" },
      cell: ({ row }) => {
        const labels = row.original.truckLabels;
        if (!labels.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 2).map((label) => (
              <Badge key={label} variant="outline" className="font-mono text-[10px]">
                {label}
              </Badge>
            ))}
            {labels.length > 2 ? (
              <Badge variant="outline" className="text-[10px]">
                +{labels.length - 2}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "litersOrdered",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Ordered" />,
      meta: { label: "Volume Ordered" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtQty(row.original.litersOrdered)} L</span>
      ),
      footer: ({ table }) =>
        `${fmtQty(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.litersOrdered, 0)
        )} L`,
    },
    {
      accessorKey: "totalAmountSoldQty",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Sold" />,
      meta: { label: "Volume Sold" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtQty(row.original.totalAmountSoldQty)} L</span>
      ),
      footer: ({ table }) =>
        `${fmtQty(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.totalAmountSoldQty, 0)
        )} L`,
    },
    {
      accessorKey: "orderCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Cost" />,
      meta: { label: "Order Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.orderCost)}</span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.orderCost, 0)
        ),
    },
    {
      accessorKey: "totalDepotToPrimaryCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Depot → Primary" />,
      meta: { label: "Depot → Primary" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {fmtMoney(row.original.totalDepotToPrimaryCost ?? 0)}
        </span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.totalDepotToPrimaryCost ?? 0), 0)
        ),
    },
    {
      accessorKey: "totalDeliveryTransportCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Transport" />,
      meta: { label: "Delivery Transport" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {fmtMoney(row.original.totalDeliveryTransportCost ?? 0)}
        </span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.totalDeliveryTransportCost ?? 0), 0)
        ),
    },
    {
      accessorKey: "totalFleetExpenses",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet Cost" />,
      meta: { label: "Fleet Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.totalFleetExpenses)}</span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.totalFleetExpenses, 0)
        ),
    },
    {
      accessorKey: "totalLossDeduction",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loss Deduction" />,
      meta: { label: "Loss Deduction" },
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            row.original.totalLossDeduction > 0 ? "text-amber-600" : "text-muted-foreground"
          )}
        >
          {row.original.totalLossDeduction > 0
            ? `−${fmtMoney(row.original.totalLossDeduction)}`
            : fmtMoney(0)}
        </span>
      ),
      footer: ({ table }) => {
        const total = table
          .getFilteredRowModel()
          .rows.reduce((sum, row) => sum + row.original.totalLossDeduction, 0);
        return total > 0 ? `−${fmtMoney(total)}` : fmtMoney(0);
      },
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost" />,
      meta: { label: "Total Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.totalCost)}</span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.totalCost, 0)
        ),
    },
    {
      accessorKey: "amountSoldRev",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Revenue" />,
      meta: { label: "Sales Revenue" },
      cell: ({ row }) => (
        <span className="font-mono text-indigo-600 tabular-nums dark:text-indigo-400">
          {fmtMoney(row.original.amountSoldRev)}
        </span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.amountSoldRev, 0)
        ),
    },
    {
      accessorKey: "amountPaid",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Collected" />,
      meta: { label: "Sales Collected" },
      cell: ({ row }) => (
        <span className="font-mono text-emerald-600 tabular-nums dark:text-emerald-400">
          {fmtMoney(row.original.amountPaid)}
        </span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.amountPaid, 0)
        ),
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profit / Loss" />,
      meta: { label: "Profit / Loss" },
      cell: ({ row }) => {
        const isProfit = row.original.pnl >= 0;
        return (
          <span className={cn("font-mono", isProfit ? "text-emerald-600" : "text-rose-600")}>
            {isProfit ? "+" : ""}
            {fmtMoney(row.original.pnl)}
          </span>
        );
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.pnl, 0);
        return (
          <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {total >= 0 ? "+" : ""}
            {fmtMoney(total)}
          </span>
        );
      },
    },
    {
      accessorKey: "debtRemaining",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debt Remaining" />,
      meta: { label: "Debt Remaining" },
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            row.original.debtRemaining > 0 ? "text-amber-600" : "text-muted-foreground"
          )}
        >
          {fmtMoney(row.original.debtRemaining)}
        </span>
      ),
      footer: ({ table }) =>
        fmtMoney(
          table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.debtRemaining, 0)
        ),
    },
  ];
}

export function getFleetPnlDetailsColumns(): ColumnDef<FleetPnlTableRow>[] {
  const moneyFooter = (
    key: "orderCost" | "totalTransportCost" | "totalFleetExpenses" | "totalCost" | "amountSoldRev" | "amountPaid" | "debtRemaining" | "purchaseCost" | "loadingCost" | "depotToPrimaryCost" | "deliveryTransportCost"
  ) =>
    ({ table }: { table: { getFilteredRowModel: () => { rows: { original: FleetPnlTableRow }[] } } }) =>
      fmtMoney(
        table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original[key] ?? 0), 0)
      );

  return [
    {
      accessorKey: "orderDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      meta: { label: "Date" },
      enableHiding: false,
      footer: () => "Total",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.orderDate), "LLL dd, y")}
        </span>
      ),
    },
    {
      accessorKey: "orderReference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      meta: { label: "Order" },
      cell: ({ row }) => <span>{row.original.orderReference}</span>,
    },
    {
      accessorKey: "productType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      meta: { label: "Product" },
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      id: "trucks",
      accessorFn: (row) => row.truckLabels.join(", "),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Truck(s)" />,
      meta: { label: "Truck(s)" },
      cell: ({ row }) => {
        const labels = row.original.truckLabels;
        if (!labels.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 2).map((label) => (
              <Badge key={label} variant="outline" className="font-mono text-[10px]">
                {label}
              </Badge>
            ))}
            {labels.length > 2 ? (
              <Badge variant="outline" className="text-[10px]">
                +{labels.length - 2}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "litersDespatched",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Despatched" />,
      meta: { label: "Volume Despatched" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {fmtQty(row.original.litersDespatched ?? row.original.litersOrdered)} L
        </span>
      ),
      footer: ({ table }) =>
        `${fmtQty(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.litersDespatched ?? row.original.litersOrdered), 0)
        )} L`,
    },
    {
      accessorKey: "litersReceived",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Received" />,
      meta: { label: "Volume Received" },
      cell: ({ row }) => {
        const received = row.original.litersReceived;
        if (received === null || received === undefined) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="font-mono tabular-nums">{fmtQty(received)} L</span>;
      },
      footer: ({ table }) =>
        `${fmtQty(
          table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.litersReceived ?? 0), 0)
        )} L`,
    },
    {
      accessorKey: "purchaseCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Purchase Cost" />,
      meta: { label: "Purchase Cost" },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono tabular-nums">{fmtMoney(row.original.purchaseCost ?? 0)}</span>
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtMoney(row.original.purchasePricePerLitre ?? 0)}/L
          </span>
        </div>
      ),
      footer: moneyFooter("purchaseCost"),
    },
    {
      accessorKey: "loadingCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loading Cost" />,
      meta: { label: "Loading Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.loadingCost ?? 0)}</span>
      ),
      footer: moneyFooter("loadingCost"),
    },
    {
      accessorKey: "depotToPrimaryCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Depot → Primary" />,
      meta: { label: "Depot → Primary" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.depotToPrimaryCost ?? 0)}</span>
      ),
      footer: moneyFooter("depotToPrimaryCost"),
    },
    {
      accessorKey: "deliveryTransportCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Transport" />,
      meta: { label: "Delivery Transport" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.deliveryTransportCost ?? 0)}</span>
      ),
      footer: moneyFooter("deliveryTransportCost"),
    },
    {
      accessorKey: "totalFleetExpenses",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet Cost" />,
      meta: { label: "Fleet Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.totalFleetExpenses)}</span>
      ),
      footer: moneyFooter("totalFleetExpenses"),
    },
    {
      accessorKey: "sellingPrice",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sold Price" />,
      meta: { label: "Sold Price" },
      cell: ({ row }) => {
        const price = row.original.sellingPrice;
        if (!price) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="font-mono tabular-nums">{fmtMoney(price)}/L</span>;
      },
    },
    {
      accessorKey: "totalLossDeduction",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loss Deduction" />,
      meta: { label: "Loss Deduction" },
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            row.original.totalLossDeduction > 0 ? "text-amber-600" : "text-muted-foreground"
          )}
        >
          {row.original.totalLossDeduction > 0
            ? `−${fmtMoney(row.original.totalLossDeduction)}`
            : fmtMoney(0)}
        </span>
      ),
      footer: ({ table }) => {
        const total = table
          .getFilteredRowModel()
          .rows.reduce((sum, row) => sum + row.original.totalLossDeduction, 0);
        return total > 0 ? `−${fmtMoney(total)}` : fmtMoney(0);
      },
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost" />,
      meta: { label: "Total Cost" },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">{fmtMoney(row.original.totalCost)}</span>
      ),
      footer: moneyFooter("totalCost"),
    },
    {
      accessorKey: "amountSoldRev",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Revenue" />,
      meta: { label: "Sales Revenue" },
      cell: ({ row }) => (
        <span className="font-mono text-indigo-600 tabular-nums dark:text-indigo-400">
          {fmtMoney(row.original.amountSoldRev)}
        </span>
      ),
      footer: moneyFooter("amountSoldRev"),
    },
    {
      accessorKey: "amountPaid",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Collected" />,
      meta: { label: "Sales Collected" },
      cell: ({ row }) => (
        <span className="font-mono text-emerald-600 tabular-nums dark:text-emerald-400">
          {fmtMoney(row.original.amountPaid)}
        </span>
      ),
      footer: moneyFooter("amountPaid"),
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profit / Loss" />,
      meta: { label: "Profit / Loss" },
      cell: ({ row }) => {
        const isProfit = row.original.pnl >= 0;
        return (
          <span className={cn("font-mono", isProfit ? "text-emerald-600" : "text-rose-600")}>
            {isProfit ? "+" : ""}
            {fmtMoney(row.original.pnl)}
          </span>
        );
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.pnl, 0);
        return (
          <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {total >= 0 ? "+" : ""}
            {fmtMoney(total)}
          </span>
        );
      },
    },
    {
      accessorKey: "debtRemaining",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debt Remaining" />,
      meta: { label: "Debt Remaining" },
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            row.original.debtRemaining > 0 ? "text-amber-600" : "text-muted-foreground"
          )}
        >
          {fmtMoney(row.original.debtRemaining)}
        </span>
      ),
      footer: moneyFooter("debtRemaining"),
    },
  ];
}
