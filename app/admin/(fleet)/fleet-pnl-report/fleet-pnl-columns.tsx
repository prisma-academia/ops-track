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
  loadingCostPerLitre?: number;
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

function trucksColumn(): ColumnDef<FleetPnlTableRow> {
  return {
    id: "trucks",
    accessorFn: (row) => row.truckLabels.join(", "),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Truck(s)" />,
    meta: { label: "Truck(s)" },
    cell: ({ row }) => {
      const labels = row.original.truckLabels;
      if (!labels.length) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-nowrap gap-1">
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
  };
}

function productColumn(): ColumnDef<FleetPnlTableRow> {
  return {
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
  };
}

function moneyFooter(
  key:
    | "orderCost"
    | "totalTransportCost"
    | "totalFleetExpenses"
    | "totalCost"
    | "amountSoldRev"
    | "amountPaid"
    | "debtRemaining"
    | "purchaseCost"
    | "loadingCost"
    | "depotToPrimaryCost"
    | "deliveryTransportCost"
    | "totalDepotToPrimaryCost"
    | "totalDeliveryTransportCost"
) {
  return ({ table }: { table: { getFilteredRowModel: () => { rows: { original: FleetPnlTableRow }[] } } }) =>
    fmtMoney(table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original[key] ?? 0), 0));
}

function pnlColumn(): ColumnDef<FleetPnlTableRow> {
  return {
    accessorKey: "pnl",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Profit / Loss" />,
    meta: { label: "Profit / Loss" },
    cell: ({ row }) => {
      const isProfit = row.original.pnl >= 0;
      return (
        <span className={cn("font-mono tabular-nums", isProfit ? "text-emerald-600" : "text-rose-600")}>
          {isProfit ? "+" : ""}
          {fmtMoney(row.original.pnl)}
        </span>
      );
    },
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.pnl, 0);
      return (
        <span className={cn("font-mono tabular-nums", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
          {total >= 0 ? "+" : ""}
          {fmtMoney(total)}
        </span>
      );
    },
  };
}

function lossDeductionColumn(): ColumnDef<FleetPnlTableRow> {
  return {
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
  };
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
          cell: ({ row }) => <span>{row.original.orderReference}</span>,
        },
        {
          accessorKey: "depot",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Depot" />,
          meta: { label: "Depot" },
          cell: ({ row }) => <span>{row.original.depot}</span>,
        },
        productColumn(),
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
          accessorKey: "purchasePricePerLitre",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Purchase Price" />,
          meta: { label: "Purchase Price" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">
              {fmtMoney(row.original.purchasePricePerLitre ?? 0)}/L
            </span>
          ),
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
          accessorKey: "orderCost",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Order Cost" />,
          meta: { label: "Order Cost" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">{fmtMoney(row.original.orderCost)}</span>
          ),
          footer: moneyFooter("orderCost"),
        },
        trucksColumn(),
        {
          accessorKey: "totalDepotToPrimaryCost",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Depot → Primary" />,
          meta: { label: "Depot → Primary" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">
              {fmtMoney(row.original.totalDepotToPrimaryCost ?? 0)}
            </span>
          ),
          footer: moneyFooter("totalDepotToPrimaryCost"),
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
          footer: moneyFooter("totalDeliveryTransportCost"),
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
        lossDeductionColumn(),
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
        pnlColumn(),
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

export function getFleetPnlDetailsColumns(): ColumnDef<FleetPnlTableRow>[] {
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
          header: ({ column }) => <DataTableColumnHeader column={column} title="Sold To" />,
          meta: { label: "Sold To" },
          cell: ({ row }) => <span>{row.original.orderReference}</span>,
        },
        productColumn(),
        {
          accessorKey: "purchasePricePerLitre",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Purchase Price" />,
          meta: { label: "Purchase Price" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">
              {fmtMoney(row.original.purchasePricePerLitre ?? 0)}/L
            </span>
          ),
        },
        {
          accessorKey: "purchaseCost",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Purchase Cost" />,
          meta: { label: "Purchase Cost" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">{fmtMoney(row.original.purchaseCost ?? 0)}</span>
          ),
          footer: moneyFooter("purchaseCost"),
        },
        {
          accessorKey: "loadingCostPerLitre",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Loading Price" />,
          meta: { label: "Loading Price" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">
              {fmtMoney(row.original.loadingCostPerLitre ?? 0)}/L
            </span>
          ),
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
          accessorKey: "orderCost",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Order Cost" />,
          meta: { label: "Order Cost" },
          cell: ({ row }) => (
            <span className="font-mono tabular-nums">{fmtMoney(row.original.orderCost)}</span>
          ),
          footer: moneyFooter("orderCost"),
        },
        {
          id: "trucks",
          accessorFn: (row) => row.truckLabels.join(", "),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Truck(s)" />,
          meta: { label: "Truck(s)" },
          cell: ({ row }) => {
            const labels = row.original.truckLabels;
            if (!labels.length) return <span className="text-muted-foreground">—</span>;
            return <span className="font-mono text-xs">{labels.join(", ")}</span>;
          },
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
            <span className="font-mono tabular-nums">
              {fmtMoney(row.original.deliveryTransportCost ?? 0)}
            </span>
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
                .rows.reduce(
                  (sum, row) => sum + (row.original.litersDespatched ?? row.original.litersOrdered),
                  0
                )
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
        lossDeductionColumn(),
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
        pnlColumn(),
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
