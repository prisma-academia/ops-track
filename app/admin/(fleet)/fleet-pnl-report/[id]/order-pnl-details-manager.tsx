"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Truck, Calendar, Wallet, Receipt, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatShortCurrency } from "@/lib/utils";
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
  // Station selling price for lost fuel
  const stationSellingPriceForLoss = useMemo(() => {
    let lossRev = 0;
    let lossQty = 0;

    transports.forEach((t) => {
      t.deliveries.forEach((s) => {
        if (s.lossLiters && s.lossLiters > 0 && s.sellingPrice > 0) {
          lossQty += s.lossLiters;
          lossRev += s.lossLiters * s.sellingPrice;
        }
      });
    });

    if (lossQty > 0 && lossRev > 0) {
      return lossRev / lossQty;
    }

    if (summary.totalAmountSoldQty > 0 && summary.amountSoldRev > 0) {
      return summary.amountSoldRev / summary.totalAmountSoldQty;
    }

    return summary.priceBought || 0;
  }, [transports, summary.amountSoldRev, summary.totalAmountSoldQty, summary.priceBought]);

  const lossLitresToDisplay = useMemo(() => {
    if (summary.totalLitersLost !== undefined && summary.totalLitersLost > 0) {
      return summary.totalLitersLost;
    }
    return Math.max(0, summary.qtyBalance);
  }, [summary.totalLitersLost, summary.qtyBalance]);

  const calculatedTotalLoss = useMemo(() => {
    if (summary.totalLossAmount && summary.totalLossAmount > 0) {
      return summary.totalLossAmount;
    }
    return lossLitresToDisplay * stationSellingPriceForLoss;
  }, [summary.totalLossAmount, lossLitresToDisplay, stationSellingPriceForLoss]);

  const breakdownRows = useMemo<FleetPnlTableRow[]>(() => {
    return transports.flatMap((transport): FleetPnlTableRow[] => {
      const truckLabels =
        transport.truckNo && transport.truckNo !== "Unknown" ? [transport.truckNo] : [];
      const truckIds = transport.truckId ? [transport.truckId] : [];

      if (transport.deliveries.length === 0) {
        const totalCost =
          transport.depotToPrimaryCost +
          transport.deliveryTransportCost +
          transport.fleetExpenses;
        return [
          {
            id: transport.id,
            orderDate: summary.orderDate,
            orderReference: transport.transporterName,
            depot: summary.depot,
            productType: summary.productType,
            litersOrdered: transport.litersCarried,
            litersDespatched: transport.litersCarried,
            litersReceived: null,
            purchaseCost: 0,
            purchasePricePerLitre: summary.priceBought,
            loadingCost: 0,
            sellingPrice: 0,
            orderCost: 0,
            depotToPrimaryCost: transport.depotToPrimaryCost,
            deliveryTransportCost: transport.deliveryTransportCost,
            totalTransportCost: transport.transportTotalCost,
            totalFleetExpenses: transport.fleetExpenses,
            totalLossDeduction: transport.lossDeduction,
            totalCost,
            totalAmountSoldQty: 0,
            amountSoldRev: 0,
            amountPaid: 0,
            debtRemaining: 0,
            pnl: -totalCost,
            truckIds,
            truckLabels,
          },
        ];
      }

      return transport.deliveries.map((delivery) => ({
        id: delivery.id,
        orderDate: delivery.createdAt,
        orderReference: delivery.soldTo,
        depot: summary.depot,
        productType: summary.productType,
        litersOrdered: delivery.litersSold,
        litersDespatched: delivery.litersSold,
        litersReceived: delivery.litersReceived ?? null,
        purchaseCost: delivery.purchaseCost,
        purchasePricePerLitre: summary.priceBought,
        loadingCost: delivery.loadingCost,
        sellingPrice: delivery.sellingPrice,
        orderCost: delivery.orderCost,
        depotToPrimaryCost: delivery.depotToPrimaryCost,
        deliveryTransportCost: delivery.deliveryTransportCost,
        totalTransportCost: delivery.transportCost,
        totalFleetExpenses: delivery.fleetCost,
        totalLossDeduction: delivery.lossAmount ?? 0,
        totalCost: delivery.totalCost,
        totalAmountSoldQty: delivery.litersReceived ?? delivery.litersSold,
        amountSoldRev: delivery.salesRevenue,
        amountPaid: delivery.paymentReceived,
        debtRemaining: delivery.debtRemaining,
        pnl: delivery.pnl,
        truckIds,
        truckLabels,
      }));
    });
  }, [transports, summary]);

  const columns = useMemo(() => getFleetPnlDetailsColumns(), []);

  const statCards = [
    {
      title: "Total Order Cost",
      value: formatShortCurrency(summary.orderCost),
      fullValue: fmtMoney(summary.orderCost),
      icon: Wallet,
      valueColor: "text-amber-600",
      iconColor: "text-amber-600",
    },
    {
      title: "Transport Cost",
      value: formatShortCurrency(summary.totalTransportCost),
      fullValue: fmtMoney(summary.totalTransportCost),
      icon: Truck,
      valueColor: "text-slate-600",
      iconColor: "text-slate-600",
    },
    {
      title: "Fleet Expenses",
      value: formatShortCurrency(summary.totalFleetExpenses),
      fullValue: fmtMoney(summary.totalFleetExpenses),
      icon: Wallet,
      valueColor: "text-slate-600",
      iconColor: "text-slate-600",
    },
    {
      title: "Loss Deduction",
      value: formatShortCurrency(summary.totalLossDeduction),
      fullValue: fmtMoney(summary.totalLossDeduction),
      icon: TrendingDown,
      valueColor: "text-rose-600",
      iconColor: "text-rose-600",
    },
    {
      title: "deliveries Revenue",
      value: formatShortCurrency(summary.amountSoldRev),
      fullValue: fmtMoney(summary.amountSoldRev),
      icon: Receipt,
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
    {
      title: "Profit & Loss",
      value: formatShortCurrency(Math.abs(summary.pnl)),
      fullValue: fmtMoney(Math.abs(summary.pnl)),
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
                  "w-full lg:w-1/6 md:w-1/3 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  (index + 1) % 3 === 0 ? "md:border-e-0" : "md:border-e",
                  index >= 3 ? "md:border-b-0" : "md:border-b",
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
      
      {/* Financial & Sold Tank Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card (5 cols): Vertically arranged Debt Remaining, Total Paid, Total Cost */}
        <Card className="lg:col-span-5 shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment & Cost Overview
            </h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
            {/* Debt Remaining */}
            <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debt Remaining</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unpaid balance</p>
              </div>
              <p className={cn("text-lg font-bold font-mono", summary.debtRemaining > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400")}>
                {fmtMoney(summary.debtRemaining)}
              </p>
            </div>

            {/* Total Paid */}
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {fmtMoney(summary.amountPaid)}
              </p>
            </div>

            {/* Total Cost */}
            <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Order & logistics cost</p>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {fmtMoney(summary.totalCost)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right (7 cols): Asset Tank + Loss Breakdown Card */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <AssetTank
            currentLitres={summary.totalAmountSoldQty}
            maxCapacity={summary.litersOrdered}
            label="Quantity Sold"
            type={summary.productType === "LPG" ? "gas" : "fuel"}
            // lossLitres={lossLitresToDisplay}
          />

          {/* Loss Calculation Card below AssetTank */}
          <Card className="shadow-xs border-border/40 bg-card p-4">            
            <div className="grid grid-cols-3 gap-3 text-center sm:text-left items-center">
              {/* Litres Loss */}
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Litres Loss</p>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {fmtQty(lossLitresToDisplay)} <span className="text-xs font-normal text-muted-foreground">{summary.productType === "LPG" ? "KG" : "L"}</span>
                </p>
              </div>

              {/* Total Loss */}
              <div className="space-y-1 text-right">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Total Loss</p>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {fmtMoney(calculatedTotalLoss)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Transports & deliveries Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Transports & deliveries Breakdown</h2>
        <DataTable
          columns={columns}
          data={breakdownRows}
          tableId="fleet-pnl-report-details"
          hideToolbar
          emptyMessage="No transports found for this order."
        />
      </div>
    </div>
  );
}

