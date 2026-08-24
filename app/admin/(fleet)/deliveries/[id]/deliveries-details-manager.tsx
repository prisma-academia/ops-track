"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  CheckCircle,
  Truck,
  Calendar,
  MapPin,
  Receipt,
  Droplets,
  Droplet,
  Printer,
  Pencil,
  MinusCircle,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { cn, formatShortCurrency, formatHumanReadableDate } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { AssetTank } from "@/components/asset-tank";
import { DataTable } from "@/components/tables";
import {
  fmtMoney,
  fmtQty,
  getFleetPnlDetailsColumns,
  type FleetPnlTableRow,
} from "@/app/admin/(fleet)/fleet-pnl-report/fleet-pnl-columns";

function fmtQtyLocal(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoneyLocal(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesDetailsManager({
  delivery,
  pnlBreakdownRow,
  orderId,
  orderReference,
}: {
  delivery: any;
  pnlBreakdownRow?: FleetPnlTableRow | null;
  orderId?: string | null;
  orderReference?: string | null;
}) {
  const router = useRouter();

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeductDialog, setOpenDeductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editLitersReceived, setEditLitersReceived] = useState(delivery.litersReceived?.toString() || "");
  const [editAmountPerLiter, setEditAmountPerLiter] = useState(delivery.amountPerLiter?.toString() || "");

  const totalExpected = Number(delivery.totalExpectedAmount);
  const paymentReceived = Number(delivery.paymentReceived);
  const outstanding = Math.max(0, totalExpected - paymentReceived);

  const litersDespatched = Number(delivery.litersDespatched || 0);
  const litersReceived = delivery.litersReceived !== null ? Number(delivery.litersReceived) : null;
  const variance = litersReceived !== null ? litersDespatched - litersReceived : null;
  const amountPerLiter = Number(delivery.amountPerLiter || 0);
  const totalDeductionAmount = variance !== null && variance > 0 ? variance * amountPerLiter : 0;
  const hasShortage = variance !== null && variance > 0;

  const hasDeduction = delivery.transport?.lossLogs?.some((l: { comment?: string | null }) => l.comment?.includes(delivery.id)) || false;

  const productType = delivery.transport?.productType || delivery.transport?.order?.productType || "PMS";
  const volumeUnit = productType === "LPG" ? "KG" : "L";
  const recipientName = delivery.customer ? delivery.customer.name : delivery.station ? delivery.station.name : "Unknown Recipient";
  const driverName = delivery.transport?.driver
    ? `${delivery.transport.driver.firstName} ${delivery.transport.driver.lastName}`.trim()
    : "N/A";

  const columns = useMemo(() => getFleetPnlDetailsColumns(), []);
  const breakdownRows = useMemo(
    () => (pnlBreakdownRow ? [pnlBreakdownRow] : []),
    [pnlBreakdownRow]
  );

  const transportCost = pnlBreakdownRow
    ? (pnlBreakdownRow.depotToPrimaryCost ?? 0) + (pnlBreakdownRow.deliveryTransportCost ?? 0)
    : 0;

  const handleDeduct = async () => {
    setIsDeducting(true);
    const res = await apiPost(`/api/tenant/fleet/deliveries/${delivery.id}/deduct-shortage`, {
      variance,
      pricePerLiter: amountPerLiter,
      totalDeduction: totalDeductionAmount,
    });
    setIsDeducting(false);

    if (!res.error) {
      setOpenDeductDialog(false);
      router.refresh();
    } else {
      alert(res.error.message);
    }
  };

  const handleEditSale = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: Record<string, number> = {};
    if (editLitersReceived) payload.litersReceived = Number(editLitersReceived);
    if (editAmountPerLiter) payload.amountPerLiter = Number(editAmountPerLiter);

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${delivery.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenEditDialog(false);
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLEARED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
            CLEARED
          </Badge>
        );
      case "PART_PAID":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
            PARTIAL PAYMENT
          </Badge>
        );
      case "UNPAID":
      default:
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold">
            UNPAID
          </Badge>
        );
    }
  };

  const volumeStatCards = [
    {
      title: "Despatched",
      value: `${fmtQtyLocal(litersDespatched)} ${volumeUnit}`,
      fullValue: `${fmtQtyLocal(litersDespatched)} ${volumeUnit}`,
      icon: Droplets,
      valueColor: "text-foreground",
      iconColor: "text-slate-600",
    },
    {
      title: "Received",
      value: litersReceived === null ? "Pending" : `${fmtQtyLocal(litersReceived)} ${volumeUnit}`,
      fullValue: litersReceived === null ? "Not yet confirmed" : `${fmtQtyLocal(litersReceived)} ${volumeUnit}`,
      icon: Droplets,
      valueColor: litersReceived === null ? "text-amber-600" : "text-foreground",
      iconColor: litersReceived === null ? "text-amber-600" : "text-slate-600",
    },
    {
      title: hasShortage ? "Shortage" : "Price / Litre",
      value: hasShortage ? `${fmtQtyLocal(variance)} ${volumeUnit}` : fmtMoneyLocal(amountPerLiter),
      fullValue: hasShortage
        ? `${fmtQtyLocal(variance)} ${volumeUnit} × ${fmtMoneyLocal(amountPerLiter)}/${volumeUnit} = ${fmtMoneyLocal(totalDeductionAmount)}`
        : `${fmtMoneyLocal(amountPerLiter)} per ${volumeUnit.toLowerCase()}`,
      icon: hasShortage ? TrendingDown : Receipt,
      valueColor: hasShortage ? "text-rose-600" : "text-foreground",
      iconColor: hasShortage ? "text-rose-600" : "text-slate-600",
    },
  ];

  const pnlStatCards = pnlBreakdownRow
    ? [
        {
          title: "Order Cost",
          value: formatShortCurrency(pnlBreakdownRow.orderCost),
          fullValue: fmtMoney(pnlBreakdownRow.orderCost),
          icon: Wallet,
          valueColor: "text-amber-600",
          iconColor: "text-amber-600",
        },
        {
          title: "Transport Cost",
          value: formatShortCurrency(transportCost),
          fullValue: fmtMoney(transportCost),
          icon: Truck,
          valueColor: "text-slate-600",
          iconColor: "text-slate-600",
        },
        {
          title: "Fleet Expenses",
          value: formatShortCurrency(pnlBreakdownRow.totalFleetExpenses),
          fullValue: fmtMoney(pnlBreakdownRow.totalFleetExpenses),
          icon: Wallet,
          valueColor: "text-slate-600",
          iconColor: "text-slate-600",
        },
        {
          title: "Loss Deduction",
          value: formatShortCurrency(pnlBreakdownRow.totalLossDeduction),
          fullValue: fmtMoney(pnlBreakdownRow.totalLossDeduction),
          icon: TrendingDown,
          valueColor: "text-rose-600",
          iconColor: "text-rose-600",
        },
        {
          title: "Sales Revenue",
          value: formatShortCurrency(pnlBreakdownRow.amountSoldRev),
          fullValue: fmtMoney(pnlBreakdownRow.amountSoldRev),
          icon: Receipt,
          valueColor: "text-indigo-600",
          iconColor: "text-indigo-600",
        },
        {
          title: "Profit & Loss",
          value: formatShortCurrency(Math.abs(pnlBreakdownRow.pnl)),
          fullValue: fmtMoney(pnlBreakdownRow.pnl),
          valueColor: pnlBreakdownRow.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
          icon: pnlBreakdownRow.pnl >= 0 ? TrendingUp : TrendingDown,
          iconColor: pnlBreakdownRow.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
        },
      ]
    : [];

  const statCards = pnlBreakdownRow ? pnlStatCards : volumeStatCards;
  const statCardCols = pnlBreakdownRow ? "lg:w-1/6 md:w-1/3" : "lg:w-1/3 md:w-1/3";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card text-card-foreground p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
            <Link href="/admin/deliveries">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              Delivery to {recipientName}
              {getStatusBadge(delivery.status)}
              <Badge variant="secondary" className="font-mono text-xs uppercase">
                {productType}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatHumanReadableDate(delivery.createdAt)}
              </span>
              {delivery.transport?.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {delivery.transport.destination}
                </span>
              )}
              {orderReference && (
                <span className="flex items-center gap-1 font-mono text-xs">
                  Order {orderReference}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {orderId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/fleet-pnl-report/${orderId}`}>
                Full P&amp;L report
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setOpenEditDialog(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/deliveries/${delivery.id}/print`}>
              <Printer className="w-4 h-4 mr-2" />
              Print Waybill
            </Link>
          </Button>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {statCards.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  "w-full border-border",
                  statCardCols,
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  (index + 1) % (pnlBreakdownRow ? 3 : 3) === 0 ? "md:border-e-0" : "md:border-e",
                  index >= (pnlBreakdownRow ? 3 : 3) ? "md:border-b-0" : "md:border-b",
                  "lg:border-b-0",
                  index === statCards.length - 1 ? "lg:border-e-0" : "lg:border-e"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>{item.value}</p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                    {item.fullValue}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="lg:col-span-5 shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {pnlBreakdownRow ? "Payment & Cost Overview" : "Payment & Delivery Overview"}
            </h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
            {pnlBreakdownRow ? (
              <>
                <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debt Remaining</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unpaid balance</p>
                  </div>
                  <p className={cn(
                    "text-lg font-bold font-mono",
                    pnlBreakdownRow.debtRemaining > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {fmtMoney(pnlBreakdownRow.debtRemaining)}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
                  </div>
                  <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(pnlBreakdownRow.amountPaid)}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Order &amp; logistics cost</p>
                  </div>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {fmtMoney(pnlBreakdownRow.totalCost)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Revenue</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {fmtQtyLocal(litersDespatched)} {volumeUnit} @ {fmtMoneyLocal(amountPerLiter)}/{volumeUnit}
                    </p>
                  </div>
                  <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">{fmtMoneyLocal(totalExpected)}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
                  </div>
                  <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmtMoneyLocal(paymentReceived)}</p>
                </div>

                <div className={cn(
                  "p-3.5 rounded-lg border flex items-center justify-between",
                  outstanding > 0 ? "bg-amber-500/5 border-amber-500/10" : "bg-emerald-500/5 border-emerald-500/10"
                )}>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Balance</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unpaid remainder</p>
                  </div>
                  <p className={cn(
                    "text-lg font-bold font-mono",
                    outstanding > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {fmtMoneyLocal(outstanding)}
                  </p>
                </div>
              </>
            )}

            {delivery.transport && (
              <div className="pt-2 border-t border-border/40 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Truck className="size-3.5" />
                  Transport
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Transporter</p>
                    <p className="font-medium text-foreground">{delivery.transport.transporter?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Truck</p>
                    <p className="font-medium text-foreground">{delivery.transport.truck?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Driver</p>
                    <p className="font-medium text-foreground">{driverName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Cost Borne By</p>
                    <Badge variant={delivery.transportCostBorneBy === "COMPANY" ? "secondary" : "default"} className="mt-0.5 text-[10px]">
                      {delivery.transportCostBorneBy || "—"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <AssetTank
            currentLitres={litersReceived ?? 0}
            maxCapacity={litersDespatched || 1}
            label={litersReceived === null ? "Awaiting receipt confirmation" : "Volume Received"}
            type={productType === "LPG" ? "gas" : "fuel"}
            lossLitres={hasShortage ? variance ?? undefined : undefined}
          />

          {hasShortage && (
            <Card className="shadow-xs border-border/40 bg-card p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center sm:text-left items-center">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Shortage</p>
                  <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                    {fmtQtyLocal(variance)} <span className="text-xs font-normal text-muted-foreground">{volumeUnit}</span>
                  </p>
                </div>
                <div className="space-y-1 border-x border-border/40 px-2 sm:px-4">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Price / Litre</p>
                  <p className="text-base font-bold font-mono text-foreground">{fmtMoneyLocal(amountPerLiter)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Amount to Deduct</p>
                  <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">{fmtMoneyLocal(totalDeductionAmount)}</p>
                </div>
              </div>

              {hasDeduction ? (
                <Badge variant="outline" className="w-full justify-center border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 py-2 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Deduction logged ({fmtMoneyLocal(totalDeductionAmount)})
                </Badge>
              ) : (
                <Button variant="destructive" className="w-full" onClick={() => setOpenDeductDialog(true)}>
                  <MinusCircle className="w-4 h-4 mr-2" />
                  Log shortage deduction
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {pnlBreakdownRow && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Cost &amp; Revenue Breakdown</h2>
            <p className="text-sm text-muted-foreground">
              {fmtQty(pnlBreakdownRow.litersDespatched ?? pnlBreakdownRow.litersOrdered)} {volumeUnit} despatched
            </p>
          </div>
          <DataTable
            columns={columns}
            data={breakdownRows}
            tableId="delivery-pnl-breakdown-v1"
            hideSearch
            hideDateFilter
            emptyMessage="No breakdown data available for this delivery."
          />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Payment History</h2>
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-xs">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="h-9 px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Method</TableHead>
                <TableHead className="h-9 px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                <TableHead className="h-9 px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Ref</TableHead>
                <TableHead className="h-9 px-3 py-2 font-bold uppercase tracking-wider text-right text-muted-foreground">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {!delivery.transactions || delivery.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                delivery.transactions.map((tx: { id: string; createdAt: string; paymentMethod?: string | null; description?: string | null; reference?: string | null; amount: number }) => (
                  <TableRow key={tx.id} className="hover:bg-muted/20">
                    <TableCell className="px-3 py-3 text-foreground/90 whitespace-nowrap">
                      {formatHumanReadableDate(tx.createdAt)}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-medium text-foreground">{tx.paymentMethod || "N/A"}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">{tx.description || "—"}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground font-mono text-[11px]">{tx.reference || "—"}</TableCell>
                    <TableCell className="px-3 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{fmtMoneyLocal(Number(tx.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update volumes & pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {delivery.station ? (
              <div className="space-y-2">
                <Label>Liters Received</Label>
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
                  Volume received must be logged by the station via Waybill Delivery.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Liters Received</Label>
                <FormattedNumberInput
                  min="0"
                  value={editLitersReceived}
                  onChange={(e) => setEditLitersReceived(e.target.value)}
                  prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Price per Liter (₦)</Label>
              <FormattedNumberInput min="0" value={editAmountPerLiter} onChange={(e) => setEditAmountPerLiter(e.target.value)} prefixText="₦" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSale} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeductDialog} onOpenChange={(val) => { if (!isDeducting) setOpenDeductDialog(val); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log shortage deduction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              A shortage of <strong>{fmtQtyLocal(variance)} L</strong> was detected.
              The driver&apos;s transport fee will be deducted by the value of the lost product.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Shortage</p>
                <p className="text-lg font-semibold">{fmtQtyLocal(variance)} L</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Price / Liter</p>
                <p className="text-lg font-semibold">{fmtMoneyLocal(amountPerLiter)}</p>
              </div>
            </div>
            <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20 text-destructive">
              <p className="text-xs uppercase tracking-widest">Amount to deduct</p>
              <p className="text-xl font-bold">{fmtMoneyLocal(totalDeductionAmount)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeductDialog(false)} disabled={isDeducting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeduct} disabled={isDeducting}>
              {isDeducting ? <SpinnerEllipsis /> : "Confirm deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
