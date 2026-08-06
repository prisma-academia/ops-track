"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Truck, Calendar, Box, Wallet, Receipt, TrendingUp, TrendingDown, Layers, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatShortCurrency } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface OrderSummary {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  loadingCost: number;
  priceBought: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalLossDeduction: number;
  totalCost: number;
  totalAmountSoldQty: number;
  qtyBalance: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
}

interface SaleData {
  id: string;
  soldTo: string;
  litersSold: number;
  sellingPrice: number;
  transportCost: number;
  salesRevenue: number;
  paymentReceived: number;
  debtRemaining: number;
  paymentStatus: string;
  createdAt: string;
}

interface TransportData {
  id: string;
  transporterName: string;
  truckNo: string;
  ratePerLiter: number;
  fleetExpenses: number;
  lossDeduction: number;
  transportTotalQty: number;
  transportTotalRev: number;
  transportTotalPaid: number;
  transportTotalCost: number;
  sales: SaleData[];
}

interface Props {
  summary: OrderSummary;
  transports: TransportData[];
}

export function OrderPnlDetailsManager({ summary, transports }: Props) {
  const statCards = [
    {
      title: "Order Cost",
      value: fmtMoney(summary.orderCost),
      icon: Wallet,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/20",
    },
    {
      title: "Transport Cost",
      value: fmtMoney(summary.totalTransportCost),
      icon: Truck,
      color: "text-slate-600",
      bg: "bg-slate-100 dark:bg-slate-900/20",
    },
    {
      title: "Fleet Expenses",
      value: fmtMoney(summary.totalFleetExpenses),
      icon: Wallet,
      color: "text-slate-600",
      bg: "bg-slate-100 dark:bg-slate-900/20",
    },
    {
      title: "Loss Deduction",
      value: fmtMoney(summary.totalLossDeduction),
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-100 dark:bg-rose-900/20",
    },
    {
      title: "Sales Revenue",
      value: fmtMoney(summary.amountSoldRev),
      icon: Receipt,
      color: "text-indigo-600",
      bg: "bg-indigo-100 dark:bg-indigo-900/20",
    },
    {
      title: "Profit/Loss",
      value: fmtMoney(Math.abs(summary.pnl)),
      icon: summary.pnl >= 0 ? TrendingUp : TrendingDown,
      color: summary.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
      bg: summary.pnl >= 0 ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-rose-100 dark:bg-rose-900/20",
      prefix: summary.pnl >= 0 ? "+" : "-",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card text-card-foreground p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
            <Link href="/admin/fleet/fleet-pnl-report">
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

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="shadow-xs border-border/40">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                <div className={cn("p-1.5 rounded-full shrink-0", stat.bg)}>
                  <stat.icon className={cn("size-3.5", stat.color)} />
                </div>
              </div>
              <p className={cn("text-lg font-bold tabular-nums", stat.color)}>
                {stat.prefix}{stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Debt summary */}
      <Card className="shadow-xs border-border/40 bg-muted/20">
        <CardContent className="p-4 flex items-center justify-around">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-xl font-bold font-mono text-emerald-600">{fmtMoney(summary.amountPaid)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Debt Remaining</p>
            <p className={cn("text-xl font-bold font-mono", summary.debtRemaining > 0 ? "text-amber-600" : "text-emerald-600")}>
              {fmtMoney(summary.debtRemaining)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Cost</p>
            <p className="text-xl font-bold font-mono text-foreground">{fmtMoney(summary.totalCost)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Transports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Transports & Sales Breakdown</h2>
        
        {transports.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-border/40">
            No transports found for this order.
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={transports.map(t => t.id)} className="space-y-4">
            {transports.map((transport) => (
              <AccordionItem key={transport.id} value={transport.id} className="bg-card rounded-xl border border-border/40 shadow-xs overflow-hidden px-1">
                <AccordionTrigger className="hover:no-underline px-4 py-4 group">
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Truck className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{transport.transporterName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">Truck: {transport.truckNo}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 pr-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sales Qty</p>
                        <p className="text-sm font-medium font-mono">{fmtQty(transport.transportTotalQty)} L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sales Rev</p>
                        <p className="text-sm font-semibold font-mono text-indigo-600">{fmtMoney(transport.transportTotalRev)}</p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex gap-6 py-3 mb-2 bg-muted/30 rounded-lg px-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rate/Liter</p>
                        <p className="text-sm font-mono font-medium">{fmtMoney(transport.ratePerLiter)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transport Cost</p>
                        <p className="text-sm font-mono font-medium">{fmtMoney(transport.transportTotalCost)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fleet Expenses</p>
                        <p className="text-sm font-mono font-medium">{fmtMoney(transport.fleetExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loss Deduction</p>
                        <p className="text-sm font-mono font-medium text-rose-500">{fmtMoney(transport.lossDeduction)}</p>
                      </div>
                    </div>
                    
                    {transport.sales.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        No sales found for this transport.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/40 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-xs h-9">Date</TableHead>
                              <TableHead className="text-xs h-9">Sold To</TableHead>
                              <TableHead className="text-xs h-9 text-right">Liters</TableHead>
                              <TableHead className="text-xs h-9 text-right">Price</TableHead>
                              <TableHead className="text-xs h-9 text-right">Revenue</TableHead>
                              <TableHead className="text-xs h-9 text-right">Paid</TableHead>
                              <TableHead className="text-xs h-9 text-right">Debt</TableHead>
                              <TableHead className="text-xs h-9 text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transport.sales.map((sale) => (
                              <TableRow key={sale.id} className="hover:bg-muted/20">
                                <TableCell className="text-xs whitespace-nowrap">{fmtDate(sale.createdAt)}</TableCell>
                                <TableCell className="text-xs font-medium">{sale.soldTo}</TableCell>
                                <TableCell className="text-xs font-mono text-right">{fmtQty(sale.litersSold)} L</TableCell>
                                <TableCell className="text-xs font-mono text-right">{fmtMoney(sale.sellingPrice)}</TableCell>
                                <TableCell className="text-xs font-mono font-medium text-right text-indigo-600">{fmtMoney(sale.salesRevenue)}</TableCell>
                                <TableCell className="text-xs font-mono font-medium text-right text-emerald-600">{fmtMoney(sale.paymentReceived)}</TableCell>
                                <TableCell className={cn("text-xs font-mono font-medium text-right", sale.debtRemaining > 0 ? "text-amber-600" : "text-slate-400")}>
                                  {fmtMoney(sale.debtRemaining)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    sale.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                    sale.paymentStatus === "Partial" ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                    "bg-rose-50 text-rose-700 border-rose-200"
                                  )}>
                                    {sale.paymentStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
