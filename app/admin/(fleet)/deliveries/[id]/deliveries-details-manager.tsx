"use client";

import { useState } from "react";
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
  Wallet,
  Receipt,
  Droplets,
  Droplet,
  Printer,
  Pencil,
  MinusCircle,
  TrendingDown,
} from "lucide-react";
import { cn, formatShortCurrency, formatHumanReadableDate } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { AssetTank } from "@/components/asset-tank";

function fmtQty(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesDetailsManager({ delivery }: { delivery: any }) {
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
  const recipientName = delivery.customer ? delivery.customer.name : delivery.station ? delivery.station.name : "Unknown Recipient";
  const driverName = delivery.transport?.driver
    ? `${delivery.transport.driver.firstName} ${delivery.transport.driver.lastName}`.trim()
    : "N/A";

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

  const statCards = [
    {
      title: "Despatched",
      value: `${fmtQty(litersDespatched)} L`,
      fullValue: `${fmtQty(litersDespatched)} L`,
      icon: Droplets,
      valueColor: "text-foreground",
      iconColor: "text-slate-600",
    },
    {
      title: "Received",
      value: litersReceived === null ? "Pending" : `${fmtQty(litersReceived)} L`,
      fullValue: litersReceived === null ? "Not yet confirmed" : `${fmtQty(litersReceived)} L`,
      icon: Droplets,
      valueColor: litersReceived === null ? "text-amber-600" : "text-foreground",
      iconColor: litersReceived === null ? "text-amber-600" : "text-slate-600",
    },
    {
      title: hasShortage ? "Shortage Deduction" : "Price / Litre",
      value: hasShortage ? formatShortCurrency(totalDeductionAmount) : fmtMoney(amountPerLiter),
      fullValue: hasShortage
        ? `${fmtQty(variance)} L × ${fmtMoney(amountPerLiter)}/L = ${fmtMoney(totalDeductionAmount)}`
        : `${fmtMoney(amountPerLiter)} per litre`,
      icon: hasShortage ? TrendingDown : Receipt,
      valueColor: hasShortage ? "text-rose-600" : "text-foreground",
      iconColor: hasShortage ? "text-rose-600" : "text-slate-600",
    },
  ];

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
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Despatched</p>
              <p className="text-sm font-bold font-mono text-foreground">{fmtQty(litersDespatched)} L</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Received</p>
              <p className="text-sm font-bold font-mono text-emerald-600">
                {litersReceived === null ? "—" : `${fmtQty(litersReceived)} L`}
              </p>
            </div>
            {hasShortage && (
              <>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shortage</p>
                  <p className="text-sm font-bold font-mono text-rose-600">{fmtQty(variance)} L</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setOpenEditDialog(true)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => window.open(`/admin/deliveries/${delivery.id}/print`, "_blank")}
            >
              <Printer className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {statCards.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  "w-full lg:w-1/3 md:w-1/3 border-border",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  (index + 1) % 3 === 0 ? "md:border-e-0" : "md:border-e",
                  index >= 3 ? "md:border-b-0" : "md:border-b",
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment & Delivery Overview</h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Revenue</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {fmtQty(litersDespatched)} L @ {fmtMoney(amountPerLiter)}/L
                </p>
              </div>
              <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">{fmtMoney(totalExpected)}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Amount received</p>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmtMoney(paymentReceived)}</p>
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
                {fmtMoney(outstanding)}
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
                    {fmtQty(variance)} <span className="text-xs font-normal text-muted-foreground">{productType === "LPG" ? "KG" : "L"}</span>
                  </p>
                </div>
                <div className="space-y-1 border-x border-border/40 px-2 sm:px-4">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Price / Litre</p>
                  <p className="text-base font-bold font-mono text-foreground">{fmtMoney(amountPerLiter)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Amount to Deduct</p>
                  <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">{fmtMoney(totalDeductionAmount)}</p>
                </div>
              </div>

              {hasDeduction ? (
                <Badge variant="outline" className="w-full justify-center border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 py-2 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Deduction logged ({fmtMoney(totalDeductionAmount)})
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
                      +{fmtMoney(Number(tx.amount))}
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
              A shortage of <strong>{fmtQty(variance)} L</strong> was detected.
              The driver&apos;s transport fee will be deducted by the value of the lost product.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Shortage</p>
                <p className="text-lg font-semibold">{fmtQty(variance)} L</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Price / Liter</p>
                <p className="text-lg font-semibold">{fmtMoney(amountPerLiter)}</p>
              </div>
            </div>
            <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20 text-destructive">
              <p className="text-xs uppercase tracking-widest">Amount to deduct</p>
              <p className="text-xl font-bold">{fmtMoney(totalDeductionAmount)}</p>
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
