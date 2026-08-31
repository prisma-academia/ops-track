"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Wallet, Receipt, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssetTank } from "@/components/asset-tank";
import { DataTable } from "@/components/tables";
import {
  fmtMoney,
  fmtQty,
  getFleetPnlDetailsColumns,
  type FleetPnlTableRow,
} from "../fleet-pnl-columns";
import { buildFleetPnlDetailRows } from "../fleet-pnl-detail-rows";
import type { OrderPnlTransportRow } from "@/lib/fleet/order-pnl-summary";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

interface OrderSummary {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  loadingCostPerLitre: number;
  totalLoadingCost: number;
  priceBought: number;
  totalDepotToPrimaryCost?: number;
  totalDeliveryTransportCost?: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalLossDeduction: number;
  totalCost: number;
  totalAmountSoldQty: number;
  qtyBalance: number;
  totalLitersLost?: number;
  totalLossAmount?: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
}

interface SaleData {
  id: string;
  soldTo: string;
  litersSold: number;
  litersReceived?: number | null;
  lossLiters?: number;
  lossAmount?: number;
  sellingPrice: number;
  purchaseCost: number;
  loadingCost: number;
  orderCost: number;
  depotToPrimaryCost: number;
  deliveryTransportCost: number;
  transportCost: number;
  fleetCost: number;
  totalCost: number;
  salesRevenue: number;
  paymentReceived: number;
  debtRemaining: number;
  pnl: number;
  paymentStatus: string;
  createdAt: string;
}

interface TransportData {
  id: string;
  transporterName: string;
  truckNo: string;
  truckId?: string | null;
  ratePerLiter: number;
  litersCarried: number;
  fleetExpenses: number;
  lossDeduction: number;
  transportTotalQty: number;
  transportTotalRev: number;
  transportTotalPaid: number;
  depotToPrimaryCost: number;
  deliveryTransportCost: number;
  transportTotalCost: number;
  deliveries: SaleData[];
}

interface Props {
  summary: OrderSummary;
  transports: TransportData[];
}

export function OrderPnlDetailsManager({ summary, transports }: Props) {
  const volumeUnit = summary.productType === "LPG" ? "KG" : "L";
  const hasLossDeduction = summary.totalLossDeduction > 0;
  const soldPrice =
    summary.totalAmountSoldQty > 0 ? summary.amountSoldRev / summary.totalAmountSoldQty : 0;
  const lossLitres = summary.totalLitersLost && summary.totalLitersLost > 0 ? summary.totalLitersLost : 0;
  const lossAmount =
    summary.totalLossAmount && summary.totalLossAmount > 0
      ? summary.totalLossAmount
      : summary.totalLossDeduction;

  const breakdownRows = useMemo<FleetPnlTableRow[]>(
    () => buildFleetPnlDetailRows(summary, transports as OrderPnlTransportRow[]),
    [transports, summary]
  );

  const columns = useMemo(() => getFleetPnlDetailsColumns(), []);

  const printExtraHtml = useMemo(() => {
    const escape = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const item = (label: string, value: string) =>
      `<div class="item"><label>${escape(label)}</label><p>${escape(value)}</p></div>`;
    const items = [
      item("Order", summary.orderReference),
      item("Date", fmtDate(summary.orderDate)),
      item("Depot", summary.depot),
      item("Product", summary.productType),
      item("Volume Ordered", `${fmtQty(summary.litersOrdered)} L`),
      item("Volume Sold", `${fmtQty(summary.totalAmountSoldQty)} L`),
      item("Balance", `${fmtQty(summary.qtyBalance)} L`),
      item("Purchase Price", `${fmtMoney(summary.priceBought)}/L`),
      item("Purchase Cost", fmtMoney(summary.priceBought * summary.litersOrdered)),
      item("Loading Price", `${fmtMoney(summary.loadingCostPerLitre)}/L`),
      item("Loading Cost", fmtMoney(summary.totalLoadingCost)),
      item("Order Cost", fmtMoney(summary.orderCost)),
      item("Depot → Primary", fmtMoney(summary.totalDepotToPrimaryCost ?? 0)),
      item("Delivery Transport", fmtMoney(summary.totalDeliveryTransportCost ?? 0)),
      item("Fleet Cost", fmtMoney(summary.totalFleetExpenses)),
      item("Loss Deduction", fmtMoney(summary.totalLossDeduction)),
      item("Total Cost", fmtMoney(summary.totalCost)),
      item("Sales Revenue", fmtMoney(summary.amountSoldRev)),
      item("Sales Collected", fmtMoney(summary.amountPaid)),
      item("Profit / Loss", fmtMoney(summary.pnl)),
    ].join("");
    return `<div class="print-details">${items}</div>`;
  }, [summary]);

  const statCards = [
    {
      title: "Total Cost",
      value: fmtMoney(summary.totalCost),
      fullValue: fmtMoney(summary.totalCost),
      icon: Wallet,
      valueColor: "text-foreground",
      iconColor: "text-slate-600",
    },
    {
      title: "Sales Revenue",
      value: fmtMoney(summary.amountSoldRev),
      fullValue: fmtMoney(summary.amountSoldRev),
      icon: Receipt,
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
    {
      title: "Amount Paid",
      value: fmtMoney(summary.amountPaid),
      fullValue: fmtMoney(summary.amountPaid),
      icon: Wallet,
      valueColor: "text-emerald-600",
      iconColor: "text-emerald-600",
    },
    {
      title: "Profit & Loss",
      value: fmtMoney(summary.pnl),
      fullValue: fmtMoney(summary.pnl),
      valueColor: summary.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
      icon: summary.pnl >= 0 ? TrendingUp : TrendingDown,
      iconColor: summary.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card text-card-foreground p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
            <Link href="/admin/fleet-pnl-report">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Order {summary.orderReference}
              <Badge variant="secondary" className="font-mono text-xs uppercase">
                {summary.productType}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {fmtDate(summary.orderDate)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {summary.depot}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ordered</p>
            <p className="text-sm font-bold font-mono text-foreground">{fmtQty(summary.litersOrdered)} L</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sold</p>
            <p className="text-sm font-bold font-mono text-emerald-600">{fmtQty(summary.totalAmountSoldQty)} L</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
            <p className="text-sm font-bold font-mono text-amber-600">{fmtQty(summary.qtyBalance)} L</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
            {statCards.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "w-full lg:w-1/4 md:w-1/2 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  (index + 1) % 2 === 0 ? "md:border-e-0" : "md:border-e",
                  index >= 2 ? "md:border-b-0" : "md:border-b",
                  "lg:border-b-0",
                  index === statCards.length - 1 ? "lg:border-e-0" : "lg:border-e"
                )}
              >
                {item.fullValue ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 flex items-start justify-between print:p-0 cursor-default hover:bg-muted/30 transition-colors h-full">
                        <div className="flex flex-col gap-2 print:gap-0.5">
                          <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                          <div>
                            <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                          <item.icon
                            size={14}
                            className={cn("text-muted-foreground", item.iconColor)}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                      {item.fullValue}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="p-4 flex items-start justify-between print:p-0 cursor-default hover:bg-muted/30 transition-colors h-full">
                    <div className="flex flex-col gap-2 print:gap-0.5">
                      <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                      <div>
                        <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                      <item.icon
                        size={14}
                        className={cn("text-muted-foreground", item.iconColor)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <AssetTank
            layout="fleet"
            currentLitres={Math.max(0, summary.qtyBalance)}
            maxCapacity={summary.litersOrdered || 1}
            label="Quantity Remaining"
            type={summary.productType === "LPG" ? "gas" : "fuel"}
          />
          <Card className="shadow-xs border-border/40 bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sold</p>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {fmtQty(summary.totalAmountSoldQty)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{volumeUnit}</span>
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</p>
                <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-500 mt-1">
                  {fmtQty(summary.qtyBalance)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{volumeUnit}</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment & Cost Overview
            </h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {fmtQty(summary.litersOrdered)} {volumeUnit} @ {fmtMoney(summary.priceBought)}/{volumeUnit}
                </p>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtMoney(summary.orderCost)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transport</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  Depot → Primary {fmtMoney(summary.totalDepotToPrimaryCost ?? 0)} · Delivery {fmtMoney(summary.totalDeliveryTransportCost ?? 0)}
                </p>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtMoney(summary.totalTransportCost)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Sold</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {fmtQty(summary.totalAmountSoldQty)} {volumeUnit}
                  {soldPrice > 0 ? ` @ ${fmtMoney(soldPrice)}/${volumeUnit}` : ""}
                </p>
              </div>
              <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {fmtMoney(summary.amountSoldRev)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {fmtMoney(summary.amountPaid)}
              </p>
            </div>

            <div className={cn(
              "p-3.5 rounded-lg border flex items-center justify-between",
              summary.debtRemaining > 0 ? "bg-amber-500/5 border-amber-500/10" : "bg-emerald-500/5 border-emerald-500/10"
            )}>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debt Remaining</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unpaid balance</p>
              </div>
              <p className={cn(
                "text-lg font-bold font-mono",
                summary.debtRemaining > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {fmtMoney(summary.debtRemaining)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Order &amp; logistics cost</p>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtMoney(summary.totalCost)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasLossDeduction && (
          <Card className="shadow-xs border-border/40 bg-card p-4">
            <div className="grid grid-cols-2 gap-3 text-center sm:text-left items-center">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Litres Lost</p>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {fmtQty(lossLitres)} <span className="text-xs font-normal text-muted-foreground">{volumeUnit}</span>
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Loss Deduction</p>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {fmtMoney(lossAmount)}
                </p>
              </div>
            </div>
          </Card>
        )}

      {/* Transports & deliveries Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Transports & deliveries Breakdown</h2>
        <DataTable
          columns={columns}
          data={breakdownRows}
          tableId="fleet-pnl-report-details-v6"
          printExtraHtml={printExtraHtml}
          hideSearch
          hideDateFilter
          emptyMessage="No transports found for this order."
        />
      </div>
    </div>
  );
}

