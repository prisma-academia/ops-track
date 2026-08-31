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
  Lock,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  stations = [],
}: {
  delivery: any;
  pnlBreakdownRow?: FleetPnlTableRow | null;
  orderId?: string | null;
  orderReference?: string | null;
  stations?: { id: string; name: string; code?: string | null }[];
}) {
  const router = useRouter();

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeductDialog, setOpenDeductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openStationSelect, setOpenStationSelect] = useState(false);
  const [editLitersDespatched, setEditLitersDespatched] = useState(delivery.litersDespatched?.toString() || "");
  const [editStationId, setEditStationId] = useState(delivery.stationId || delivery.station?.id || "");
  const [editLitersReceived, setEditLitersReceived] = useState(delivery.litersReceived?.toString() || "");
  const [editAmountPerLiter, setEditAmountPerLiter] = useState(delivery.amountPerLiter?.toString() || "");

  const isReceived = delivery.litersReceived !== null;
  const selectedStation =
    stations.find((s) => s.id === editStationId) ||
    (delivery.station ? { id: delivery.station.id, name: delivery.station.name, code: delivery.station.code } : null);

  const totalExpected = Number(delivery.totalExpectedAmount);
  const paymentReceived = Number(delivery.paymentReceived);
  const outstanding = Math.max(0, totalExpected - paymentReceived);

  const carried = Number(delivery.transport?.litersCarried || 0);
  const otherDeliveries = (delivery.transport?.deliveries || []).filter(
    (d: { id: string; litersDespatched: unknown }) => d.id !== delivery.id
  );
  const otherDistributed = otherDeliveries.reduce(
    (sum: number, d: { litersDespatched: unknown }) => sum + Number(d.litersDespatched || 0),
    0
  );
  const maxAvailableVolume = carried > 0 ? Math.max(0, carried - otherDistributed) : null;

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
  const depotName =
    delivery.transport?.order?.sourceDepot || pnlBreakdownRow?.depot || "Depot";
  const primaryDestination = delivery.transport?.destination || "Primary";
  const depotToPrimaryRate = Number(delivery.transport?.ratePerLiter || 0);
  const deliveryTransportRateValue = Number(delivery.transportRate);
  const deliveryTransportRate =
    Number.isFinite(deliveryTransportRateValue) && deliveryTransportRateValue > 0
      ? deliveryTransportRateValue
      : null;

  const columns = useMemo(() => getFleetPnlDetailsColumns(), []);
  const breakdownRows = useMemo(
    () => (pnlBreakdownRow ? [pnlBreakdownRow] : []),
    [pnlBreakdownRow]
  );

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

    const payload: Record<string, any> = {};
    if (editAmountPerLiter) payload.amountPerLiter = Number(editAmountPerLiter);

    if (!isReceived) {
      if (editLitersDespatched) {
        const numDespatched = Number(editLitersDespatched);
        if (maxAvailableVolume !== null && numDespatched > maxAvailableVolume) {
          setError(
            `Dispatch volume exceeds transport's available quantity (${fmtQtyLocal(maxAvailableVolume)} ${volumeUnit}).`
          );
          setIsSubmitting(false);
          return;
        }
        payload.litersDespatched = numDespatched;
      }
      if (editStationId && editStationId !== delivery.stationId) payload.stationId = editStationId;
    }

    if (!delivery.station && editLitersReceived) {
      payload.litersReceived = Number(editLitersReceived);
    }

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

  const volumeDisplay =
    litersReceived !== null
      ? `${fmtQtyLocal(litersReceived)} ${volumeUnit}`
      : `${fmtQtyLocal(litersDespatched)} ${volumeUnit}`;
  const volumeFullValue =
    litersReceived !== null
      ? `Received ${fmtQtyLocal(litersReceived)} ${volumeUnit} of ${fmtQtyLocal(litersDespatched)} ${volumeUnit} despatched`
      : `${fmtQtyLocal(litersDespatched)} ${volumeUnit} despatched`;

  const pnlStatCards = pnlBreakdownRow
    ? [
        {
          title: "Volume",
          value: volumeDisplay,
          fullValue: volumeFullValue,
          icon: Droplets,
          valueColor: litersReceived === null ? "text-amber-600" : "text-foreground",
          iconColor: litersReceived === null ? "text-amber-600" : "text-slate-600",
        },
        {
          title: "Sales Revenue",
          value: fmtMoney(pnlBreakdownRow.amountSoldRev),
          fullValue: fmtMoney(pnlBreakdownRow.amountSoldRev),
          icon: Receipt,
          valueColor: "text-indigo-600",
          iconColor: "text-indigo-600",
        },
        {
          title: "Total Cost",
          value: fmtMoney(pnlBreakdownRow.totalCost),
          fullValue: fmtMoney(pnlBreakdownRow.totalCost),
          icon: Wallet,
          valueColor: "text-foreground",
          iconColor: "text-slate-600",
        },
        {
          title: "Profit & Loss",
          value: fmtMoney(pnlBreakdownRow.pnl),
          fullValue: fmtMoney(pnlBreakdownRow.pnl),
          valueColor: pnlBreakdownRow.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
          icon: pnlBreakdownRow.pnl >= 0 ? TrendingUp : TrendingDown,
          iconColor: pnlBreakdownRow.pnl >= 0 ? "text-emerald-600" : "text-rose-600",
        },
      ]
    : [];

  const statCards = pnlBreakdownRow ? pnlStatCards : volumeStatCards;
  const statCardCols = pnlBreakdownRow ? "lg:w-1/4 md:w-1/2" : "lg:w-1/3 md:w-1/3";
  const mdCols = pnlBreakdownRow ? 2 : 3;

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
                  (index + 1) % mdCols === 0 ? "md:border-e-0" : "md:border-e",
                  index >= mdCols ? "md:border-b-0" : "md:border-b",
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {pnlBreakdownRow ? (
          <Card className="shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-muted/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cost Breakdown
              </h3>
            </div>
            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
              <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Cost</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {fmtQty(pnlBreakdownRow.litersDespatched ?? pnlBreakdownRow.litersOrdered)} {volumeUnit} @ {fmtMoney(pnlBreakdownRow.purchasePricePerLitre ?? 0)}/{volumeUnit}
                  </p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.purchaseCost ?? 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loading Cost</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {fmtMoney(pnlBreakdownRow.loadingCostPerLitre ?? 0)}/{volumeUnit}
                  </p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.loadingCost ?? 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {depotName} → {primaryDestination}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {fmtMoneyLocal(depotToPrimaryRate)}/{volumeUnit}
                  </p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.depotToPrimaryCost ?? 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Transport</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {deliveryTransportRate != null
                      ? `${fmtMoneyLocal(deliveryTransportRate)}/${volumeUnit}`
                      : "Primary to destination"}
                  </p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.deliveryTransportCost ?? 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fleet Expenses</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Allocated trip maintenance</p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.totalFleetExpenses)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Allocated to this delivery</p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {fmtMoney(pnlBreakdownRow.totalCost)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {pnlBreakdownRow ? "Payment & Cost Overview" : "Payment & Delivery Overview"}
            </h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Amount</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {fmtQtyLocal(litersDespatched)} {volumeUnit} @ {fmtMoneyLocal(amountPerLiter)}/{volumeUnit}
                </p>
              </div>
              <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {fmtMoneyLocal(totalExpected)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-500/5 border border-slate-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Received</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Volume confirmed</p>
              </div>
              <p className={cn(
                "text-lg font-bold font-mono",
                litersReceived === null ? "text-amber-600 dark:text-amber-500" : "text-foreground"
              )}>
                {litersReceived === null ? "Pending" : `${fmtQtyLocal(litersReceived)} ${volumeUnit}`}
              </p>
            </div>

            <div className={cn(
              "p-3.5 rounded-lg border flex items-center justify-between",
              hasShortage ? "bg-rose-500/5 border-rose-500/10" : "bg-emerald-500/5 border-emerald-500/10"
            )}>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variance</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Despatched − received</p>
              </div>
              <p className={cn(
                "text-lg font-bold font-mono",
                variance === null
                  ? "text-muted-foreground"
                  : hasShortage
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
              )}>
                {variance === null
                  ? "—"
                  : `${hasShortage ? "−" : ""}${fmtQtyLocal(Math.abs(variance))} ${volumeUnit}`}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {fmtMoneyLocal(pnlBreakdownRow ? pnlBreakdownRow.amountPaid : paymentReceived)}
              </p>
            </div>

            <div className={cn(
              "p-3.5 rounded-lg border flex items-center justify-between",
              outstanding > 0 ? "bg-amber-500/5 border-amber-500/10" : "bg-emerald-500/5 border-emerald-500/10"
            )}>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {pnlBreakdownRow ? "Debt Remaining" : "Outstanding Balance"}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Unpaid remainder</p>
              </div>
              <p className={cn(
                "text-lg font-bold font-mono",
                outstanding > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {fmtMoneyLocal(pnlBreakdownRow ? pnlBreakdownRow.debtRemaining : outstanding)}
              </p>
            </div>

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

        {hasShortage && (
          <div className={cn(pnlBreakdownRow && "lg:col-span-2")}>
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
          </div>
        )}
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
            tableId="delivery-pnl-breakdown-v3"
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

      <Dialog
        open={openEditDialog}
        onOpenChange={(open: boolean) => {
          if (!isSubmitting) {
            setOpenEditDialog(open);
            if (open) {
              setEditLitersDespatched(delivery.litersDespatched?.toString() || "");
              setEditStationId(delivery.stationId || delivery.station?.id || "");
              setEditLitersReceived(delivery.litersReceived?.toString() || "");
              setEditAmountPerLiter(delivery.amountPerLiter?.toString() || "");
              setError(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Delivery Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Station selection */}
            {(delivery.station || stations.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stationId">Station</Label>
                  {isReceived && (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked (Received)
                    </span>
                  )}
                </div>
                {isReceived ? (
                  <div className="p-2.5 rounded-lg border bg-muted/40 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {delivery.station?.name || selectedStation?.name || "Station"}
                      {(delivery.station?.code || selectedStation?.code) && ` (${delivery.station?.code || selectedStation?.code})`}
                    </span>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                ) : (
                  <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="stationId"
                        className="w-full justify-between font-normal text-left"
                      >
                        <span className="truncate">
                          {selectedStation
                            ? `${selectedStation.name}${selectedStation.code ? ` (${selectedStation.code})` : ""}`
                            : "Select station..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search station..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>No station found.</CommandEmpty>
                          <CommandGroup>
                            {stations.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.name} ${s.code || ""} ${s.id}`.toLowerCase()}
                                onSelect={() => {
                                  setEditStationId(s.id);
                                  setOpenStationSelect(false);
                                }}
                              >
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-sm">{s.name}</span>
                                  {s.code && <span className="text-xs text-muted-foreground mt-0.5">Code: {s.code}</span>}
                                </div>
                                {editStationId === s.id && (
                                  <Check className="ml-auto h-4 w-4 text-primary" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {isReceived && (
                  <p className="text-[11px] text-muted-foreground">
                    Station cannot be changed after delivery has been received.
                  </p>
                )}
              </div>
            )}

            {/* Dispatch Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="litersDespatched">Dispatch Volume ({volumeUnit})</Label>
                {isReceived ? (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked (Received)
                  </span>
                ) : maxAvailableVolume !== null ? (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Available: <strong className="text-foreground">{fmtQtyLocal(maxAvailableVolume)} {volumeUnit}</strong>
                  </span>
                ) : null}
              </div>
              <FormattedNumberInput
                id="litersDespatched"
                min="0"
                value={editLitersDespatched}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEditLitersDespatched(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isReceived}
                prefixIcon={<Droplets className="w-4 h-4 text-muted-foreground" />}
              />
              {isReceived ? (
                <p className="text-[11px] text-muted-foreground">
                  Dispatch volume cannot be modified after delivery has been received.
                </p>
              ) : maxAvailableVolume !== null ? (
                <p className="text-[11px] text-muted-foreground">
                  Truck loaded capacity: {fmtQtyLocal(carried)} {volumeUnit} (Max available for this delivery: {fmtQtyLocal(maxAvailableVolume)} {volumeUnit})
                </p>
              ) : null}
            </div>

            {/* Received Volume */}
            {delivery.station ? (
              <div className="space-y-2">
                <Label>Liters Received</Label>
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
                  Volume received must be logged by the station via Waybill Delivery.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="litersReceived">Liters Received</Label>
                <FormattedNumberInput
                  id="litersReceived"
                  min="0"
                  value={editLitersReceived}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLitersReceived(e.target.value)}
                  prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                />
              </div>
            )}

            {/* Price per Liter */}
            <div className="space-y-2">
              <Label htmlFor="amountPerLiter">Price per {volumeUnit === "KG" ? "KG" : "Litre"} (₦)</Label>
              <FormattedNumberInput
                id="amountPerLiter"
                min="0"
                value={editAmountPerLiter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditAmountPerLiter(e.target.value)}
                prefixText="₦"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSale} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeductDialog} onOpenChange={(val: boolean) => { if (!isDeducting) setOpenDeductDialog(val); }}>
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
