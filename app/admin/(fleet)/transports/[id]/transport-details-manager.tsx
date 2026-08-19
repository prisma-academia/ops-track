"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Truck, AlertTriangle, CheckCircle, Droplets, Wallet, FileText, Link2, ChevronsUpDown, Coins, CircleCheck, Receipt, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { AssetTank } from "@/components/asset-tank";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Droplet } from "lucide-react";
import { TransportFeeBreakdown, getTransactionFeeLegLabel } from "@/components/fleet/transport-fee-breakdown";
import { getFeeLegBreakdown } from "@/lib/fleet/transport-fees";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function TransportDetailsManager({
  transport,
  orders = [],
  originToDepotFee = 0,
}: {
  transport: any;
  orders?: any[];
  originToDepotFee?: number;
}) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openLinkOrderDialog, setOpenLinkOrderDialog] = useState(false);
  const [openOrderSelect, setOpenOrderSelect] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(transport.orderId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);

  // Incident form state
  const [lossType, setLossType] = useState("THEFT");
  const [lostQuantity, setLostQuantity] = useState("");
  const [expensesIncurred, setExpensesIncurred] = useState("");
  const [lossComment, setLossComment] = useState("");
  const [terminateTrip, setTerminateTrip] = useState(false);

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: any = { status: newStatus };

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenStatusDialog(false);
      router.refresh();
    }
  };



  const handleLinkOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, {
      orderId: selectedOrderId || null,
    });
    setIsSubmitting(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenLinkOrderDialog(false);
      router.refresh();
    }
  };

  const handleLogIncident = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!lossType || !lostQuantity) {
      setError("Loss Type and Lost Quantity are required");
      setIsSubmitting(false);
      return;
    }

    if (Number(lostQuantity) <= 0) {
      setError("Lost Quantity must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (Number(expensesIncurred) < 0) {
      setError("Expenses cannot be negative");
      setIsSubmitting(false);
      return;
    }

    const payload: any = {
      lossLog: {
        lossType,
        lostQuantity: Number(lostQuantity),
        expensesIncurred: Number(expensesIncurred || 0),
        comment: lossComment
      },
      addLitersLost: Number(lostQuantity),
      addMaintenanceCost: Number(expensesIncurred || 0)
    };

    if (terminateTrip) {
      payload.status = "LOSS";
    }

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenIncidentDialog(false);
      setLossType("THEFT");
      setLostQuantity("");
      setExpensesIncurred("");
      setLossComment("");
      setTerminateTrip(false);
      router.refresh();
    }
  };



  const lossLogs = transport.lossLogs || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/admin/transports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
              Trip to {transport.destination}
              <Badge variant={transport.status === "COMPLETED" ? "default" : transport.status === "LOSS" ? "destructive" : transport.status === "CANCELLED" ? "secondary" : "outline"}>
                {transport.status}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {transport.transporter?.name} • {transport.truck?.name || "No truck"} • {transport.productType || "—"}
            </p>
          </div>
        </div>
        
        <Button onClick={() => setOpenStatusDialog(true)} variant="outline">
          <CheckCircle className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-2xl border bg-card">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Transporter</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.transporter.name}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Truck</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.truck?.name || "Unassigned"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Driver</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unassigned"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Product Type</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.productType}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Order Reference</p>
          <div className="flex items-center gap-2 mt-0.5">
            {transport.order?.reference ? (
              <Link href={`/admin/orders/${transport.order.id}`} className="text-sm font-medium text-primary hover:underline">
                {transport.order.reference}
              </Link>
            ) : (
              <>
                <span className="text-sm font-medium text-muted-foreground">No order linked</span>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setOpenLinkOrderDialog(true)}>
                  <Link2 className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
              <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="distribution" className="text-[15px] font-semibold">Distribution ({transport.deliveries?.length || 0})</TabsTrigger>
              <TabsTrigger value="losses" className="text-[15px] font-semibold text-red-600 dark:text-red-400">Loss Logs ({lossLogs.length})</TabsTrigger>
              <TabsTrigger value="payments" className="text-[15px] font-semibold">Payments & Expenses ({(transport.transactions || []).length})</TabsTrigger>

            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-8">
              {/* Section 1: Volume Reconciliation */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      Volume Reconciliation
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track how the loaded volume was distributed and identify any shortages.
                    </p>
                  </div>
                </div>

                {(() => {
                  const carriedVolume = Number(transport.litersCarried) || 0;
                  const salesVol = (transport.deliveries || []).reduce((acc: number, sale: any) => acc + (Number(sale.litersDespatched) || 0), 0);
                  const distributedVolume = salesVol;
                  const remainingVolume = Math.max(0, carriedVolume - distributedVolume);

                  const variance = (transport.deliveries || []).reduce((sum: number, item: any) => {
                    const despatched = Number(item.litersDespatched || item.litersSold || 0);
                    const received = item.litersReceived;
                    if (received !== null && received !== undefined) {
                      return sum + (despatched - Number(received));
                    }
                    return sum;
                  }, 0);

                  const variancePercentage = carriedVolume > 0 ? (variance / carriedVolume) * 100 : 0;
                  const distributedPercentage = carriedVolume > 0 ? (distributedVolume / carriedVolume) * 100 : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Loaded Volume</p>
                          <p className="text-2xl font-bold text-foreground">{carriedVolume.toLocaleString()} L</p>
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distributed</p>
                          <p className="text-2xl font-bold text-foreground">{distributedVolume.toLocaleString()} L</p>
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remaining to Deliver</p>
                          <p className="text-2xl font-bold text-foreground">{remainingVolume.toLocaleString()} L</p>
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shortage (Variance)</p>
                          <div className="flex items-end gap-2">
                            <p className={cn("text-2xl font-bold", variance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500")}>
                              {variance.toLocaleString()} L
                            </p>
                            {variance > 0 && (
                              <span className="text-xs font-medium text-destructive mb-1">({variancePercentage.toFixed(2)}%)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl border bg-card shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-foreground">Delivery Progress</span>
                            <span className="text-sm font-bold text-primary">{Math.round(distributedPercentage)}%</span>
                          </div>
                          <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${Math.min(distributedPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                            <span>0 L</span>
                            <span>{carriedVolume.toLocaleString()} L Total</span>
                          </div>
                        </div>
                        
                        <div className="">
                          <AssetTank 
                            currentLitres={remainingVolume} 
                            maxCapacity={carriedVolume} 
                            label="Remaining in Transport" 
                            type={transport.productType === "LPG" ? "gas" : "fuel"} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* Section 2: Financial Overview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                      Financial Overview
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      High-level summary of trip finances. See the fee breakdown below for leg-by-leg detail.
                    </p>
                  </div>
                </div>

                {(() => {
                  const feeTransactions = (transport.transactions || []).filter(
                    (txn: any) => txn.category === "TRANSPORT_PAYMENT"
                  );
                  const feeBreakdown = getFeeLegBreakdown(transport, feeTransactions, { originToDepotFee });
                  const fullTripRow = feeBreakdown.find((row) => row.feeLeg === "FULL_TRIP");
                  const grossTransportFee = fullTripRow?.expected ?? 0;
                  const transportFeesPaid = feeTransactions.reduce(
                    (sum: number, txn: any) => sum + Number(txn.amount || 0),
                    0
                  );
                  const totalLossDeductions = lossLogs.reduce(
                    (sum: number, log: any) => sum + Number(log.expensesIncurred || 0),
                    0
                  );
                  const fleetExpenses = (transport.transactions || [])
                    .filter((txn: any) => txn.category === "EXPENSE")
                    .reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
                  const netOutstanding = grossTransportFee - transportFeesPaid - totalLossDeductions - fleetExpenses;
                  const paymentProgress = grossTransportFee > 0
                    ? Math.min(100, Math.round((transportFeesPaid / grossTransportFee) * 100))
                    : 0;

                  const fmt = (amount: number) => `₦${amount.toLocaleString()}`;

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardDescription className="text-sm font-medium">Gross Transport Fee</CardDescription>
                            <Coins className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{fmt(grossTransportFee)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total expected transporter payout</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardDescription className="text-sm font-medium">Transport Fees Paid</CardDescription>
                            <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
                              {fmt(transportFeesPaid)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {paymentProgress}% of gross fee settled
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardDescription className="text-sm font-medium">Loss Deductions</CardDescription>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </CardHeader>
                          <CardContent>
                            <div className={cn(
                              "text-2xl font-bold tabular-nums",
                              totalLossDeductions > 0 ? "text-destructive" : "text-foreground"
                            )}>
                              {fmt(totalLossDeductions)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {lossLogs.length} incident{lossLogs.length === 1 ? "" : "s"} logged
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardDescription className="text-sm font-medium">Fleet Expenses</CardDescription>
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className={cn(
                              "text-2xl font-bold tabular-nums",
                              fleetExpenses > 0 ? "text-amber-600 dark:text-amber-500" : "text-foreground"
                            )}>
                              {fmt(fleetExpenses)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Operational costs on this trip</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                          <div>
                            <CardDescription className="text-sm font-medium">Net Outstanding</CardDescription>
                            <p className="text-xs text-muted-foreground mt-1">
                              Remaining balance after payments, losses, and fleet expenses
                            </p>
                          </div>
                          <CircleDollarSign className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                          <div className={cn(
                            "text-3xl font-bold tabular-nums",
                            netOutstanding > 0
                              ? "text-primary"
                              : netOutstanding < 0
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-500"
                          )}>
                            {fmt(netOutstanding)}
                          </div>
                          {grossTransportFee > 0 && (
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Payment progress</span>
                                <span className="font-medium">{paymentProgress}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${paymentProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </div>

              {transport.comment && (
                <>
                  <Separator />
                  <div className="p-5 rounded-2xl border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Trip Notes</p>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{transport.comment}</p>
                  </div>
                </>
              )}

              <Separator />

              <TransportFeeBreakdown transport={transport} originToDepotFee={originToDepotFee} />
            </TabsContent>

            <TabsContent value="distribution" className="mt-6 space-y-4">
              <div className="mb-2">
                <h3 className="font-semibold text-lg">Distribution & Sales</h3>
                <p className="text-sm text-muted-foreground">Recorded sales and fuel distributed to stations or external clients.</p>
              </div>
              <div className="border rounded-2xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Recipient</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Despatched</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Received</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Price/L (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!transport.deliveries || transport.deliveries.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No sales/distribution recorded for this trip.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {transport.deliveries?.map((sale: any) => (
                          <tr key={sale.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                            <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                              {new Date(sale.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">
                                {sale.customer ? sale.customer.name : sale.station ? sale.station.name : 'Unknown'}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase">
                                {sale.customer ? 'EXTERNAL CLIENT' : 'OWNED STATION'}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(sale.litersDespatched || sale.litersSold).toLocaleString()} L</td>
                            <td className="text-right py-3 px-4">
                              {sale.litersReceived !== null && sale.litersReceived !== undefined ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-emerald-600 dark:text-emerald-500">{Number(sale.litersReceived).toLocaleString()} L</span>
                                  {Number(sale.litersDespatched || sale.litersSold) !== Number(sale.litersReceived) && (
                                    <span className="text-[10px] text-destructive font-medium uppercase mt-0.5">
                                      Diff: {(Number(sale.litersDespatched || sale.litersSold) - Number(sale.litersReceived)).toLocaleString()} L
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium text-amber-600 dark:text-amber-500">Pending</span>
                              )}
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-mono text-xs">₦{Number(sale.amountPerLiter || 0).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(sale.totalExpectedAmount || sale.totalAmount || (Number(sale.litersDespatched || sale.litersSold || 0) * Number(sale.amountPerLiter || 0))).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90">
                              <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="text-[10px]">
                                {sale.transportCostBorneBy === 'COMPANY' ? 'COMPANY' : 'CLIENT'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    {((transport.deliveries && transport.deliveries.length > 0)) ? (
                      <>
                        <tr className="bg-muted/30 border-t border-border/50 font-bold">
                          <td colSpan={2} className="text-right py-3 px-4 text-foreground">Total:</td>
                        <td className="text-right py-3 px-4 text-foreground">
                          {(() => {
                             const salesDespatched = (transport.deliveries || []).reduce((sum: number, sale: any) => sum + Number(sale.litersDespatched || sale.litersSold || 0), 0);
                             return `${(salesDespatched).toLocaleString()} L`;
                          })()}
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600 dark:text-emerald-500">
                          {(() => {
                             const salesReceived = (transport.deliveries || []).reduce((sum: number, sale: any) => sum + (sale.litersReceived !== null && sale.litersReceived !== undefined ? Number(sale.litersReceived) : 0), 0);
                             return `${(salesReceived).toLocaleString()} L`;
                          })()}
                        </td>
                        <td></td>
                        <td className="text-right py-3 px-4 text-foreground font-mono text-xs">
                          {(() => {
                             const salesAmount = (transport.deliveries || []).reduce((sum: number, sale: any) => sum + Number(sale.totalExpectedAmount || sale.totalAmount || (Number(sale.litersDespatched || sale.litersSold || 0) * Number(sale.amountPerLiter || 0))), 0);
                             return `₦${(salesAmount).toLocaleString()}`;
                          })()}
                        </td>
                        <td></td>
                      </tr>
                      {(() => {
                         const variance = (transport.deliveries || []).reduce((sum: number, item: any) => {
                           const despatched = Number(item.litersDespatched || item.litersSold || 0);
                           const received = item.litersReceived;
                           if (received !== null && received !== undefined) {
                             return sum + (despatched - Number(received));
                           }
                           return sum;
                         }, 0);

                         if (variance <= 0) return null;

                         return (
                           <tr className="bg-destructive/5 border-t border-destructive/20 font-bold text-destructive">
                             <td colSpan={3} className="text-right py-3 px-4 uppercase text-[11px] tracking-wider">Total Variance / Shortage:</td>
                             <td className="text-right py-3 px-4">{variance.toLocaleString()} L</td>
                             <td colSpan={3}></td>
                           </tr>
                         );
                      })()}
                    </>
                    ) : null}
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="losses" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Loss Logs</h3>
                  <p className="text-sm text-muted-foreground">Track any spills, thefts, or direct maintenance expenses incurred.</p>
                </div>
                <Button variant="destructive" onClick={() => setOpenIncidentDialog(true)}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Log Incident or Loss
                </Button>
              </div>
              {lossLogs.length === 0 ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No losses recorded for this trip.</p>
                </div>
              ) : (
                lossLogs.map((log: any) => (
                  <div key={log.id} className="p-5 rounded-2xl border bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-red-700 dark:text-red-400">{log.lossType}</h4>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Lost Quantity</p>
                        <p className="font-medium">{Number(log.lostQuantity)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expenses Incurred</p>
                        <p className="font-medium">₦{Number(log.expensesIncurred).toLocaleString()}</p>
                      </div>
                    </div>
                    {log.comment && (
                      <p className="text-sm bg-background/50 dark:bg-background/40 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        {log.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Payments & Expenses</h3>
                  <p className="text-sm text-muted-foreground">Outgoing payments for fleet-related expenses and transport fees.</p>
                </div>
              </div>
              
              {(!transport.transactions || transport.transactions.length === 0) ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No payments or expenses recorded for this trip.</p>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fee Leg</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Method & Ref</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Receipt</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transport.transactions.map((txn: any, idx: number) => (
                        <tr key={txn.id || idx} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">
                              {txn.category === "FLEET_EXPENSE" ? "Fleet Expense" : txn.category === "TRANSPORT_PAYMENT" ? "Transport Fee" : txn.category}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground/90 text-xs">
                            {txn.category === "TRANSPORT_PAYMENT" ? getTransactionFeeLegLabel(txn, transport) : "—"}
                          </td>
                          <td className="py-3 px-4 text-foreground/90 max-w-[200px] truncate" title={txn.description || ""}>
                            {txn.description || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-foreground/90">{txn.paymentMethod || "N/A"}</div>
                            {txn.reference && <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{txn.reference}</div>}
                          </td>
                          <td className="text-right py-3 px-4">
                            {txn.receiptUrl ? (
                              <a href={txn.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                View
                              </a>
                            ) : "—"}
                          </td>
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium font-mono text-destructive">
                            {Number(txn.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border/50 font-bold">
                        <td colSpan={6} className="text-right py-3 px-4 text-foreground">Total Payments & Expenses:</td>
                        <td className="text-right py-3 px-4 text-destructive font-mono text-base">
                          {(() => {
                             const totalAmount = transport.transactions.reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
                             return `₦${totalAmount.toLocaleString()}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>



      {/* Update Status Dialog */}
      <Dialog open={openStatusDialog} onOpenChange={setOpenStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Trip Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Incident Dialog */}
      <Dialog open={openIncidentDialog} onOpenChange={setOpenIncidentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Log Incident or Loss
            </DialogTitle>
            <DialogDescription>
              Record any spills, accidents, or theft. This will automatically deduct the lost volume from the transport earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Incident Type</Label>
              <Select value={lossType} onValueChange={setLossType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance </SelectItem>
                  <SelectItem value="ACCIDENT">Accident</SelectItem>
                  <SelectItem value="OTHERS">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lost Quantity (L)*</Label>
                <FormattedNumberInput min="0" value={lostQuantity} onChange={(e) => setLostQuantity(e.target.value)} placeholder="0" prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />} />
              </div>
              <div className="space-y-2">
                <Label>Direct Expenses (₦)</Label>
                <FormattedNumberInput min="0" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" prefixText="₦" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={lossComment} onChange={(e) => setLossComment(e.target.value)} placeholder="Explain what happened..." />
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-destructive/5 border-destructive/20 mt-4">
              <Checkbox id="terminateTrip" checked={terminateTrip} onCheckedChange={(c) => setTerminateTrip(!!c)} />
              <div className="space-y-1 leading-none">
                <Label htmlFor="terminateTrip" className="font-semibold text-destructive">Terminate Trip (Total Loss)</Label>
                <p className="text-xs text-muted-foreground">
                  Check this if the transport cannot proceed. The status will be marked as LOSS.
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIncidentDialog(false)}>Cancel</Button>
            <Button onClick={handleLogIncident} disabled={isSubmitting} variant="destructive">
              {isSubmitting ? <SpinnerEllipsis /> : "Submit Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openLinkOrderDialog} onOpenChange={setOpenLinkOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link to Order</DialogTitle>
            <DialogDescription>
              Associate this transport with a procurement order for volume tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Procurement Order</Label>
              <Popover open={openOrderSelect} onOpenChange={setOpenOrderSelect}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {selectedOrderId
                        ? (() => {
                            const o = orders.find((x: any) => x.id === selectedOrderId);
                            return o ? `${o.sourceDepot || "Depot"} - ${o.reference || "Unnamed"}` : "Select order...";
                          })()
                        : "Select order..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search order..." />
                    <CommandList>
                      <CommandEmpty>No order found.</CommandEmpty>
                      <CommandGroup>
                        {orders.map((o: any) => (
                          <CommandItem
                            key={o.id}
                            value={`${o.reference || o.id} ${o.sourceDepot || ""}`}
                            onSelect={() => {
                              setSelectedOrderId(o.id);
                              setOpenOrderSelect(false);
                            }}
                          >
                            {o.sourceDepot || "Depot"} - {o.reference || "Unnamed"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLinkOrderDialog(false)}>Cancel</Button>
            <Button onClick={handleLinkOrder} disabled={isSubmitting || !selectedOrderId}>
              {isSubmitting ? <SpinnerEllipsis /> : "Link Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
