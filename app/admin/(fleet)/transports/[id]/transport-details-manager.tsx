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
import { ArrowLeft, Truck, AlertTriangle, CheckCircle, CheckCircle2, Clock, Droplets, FileText, Link2, ChevronsUpDown, Printer, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { AssetTank } from "@/components/asset-tank";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Droplet } from "lucide-react";
import { TransportFeeBreakdown, getTransactionFeeLegLabel } from "@/components/fleet/transport-fee-breakdown";
import { PRODUCT_LOSS_TYPES, getLossTypeLabel, getProductLossType, isNotesRequiredForLossType } from "@/lib/fleet/loss-types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FilePreviewButton } from "@/components/file-viewer-modal";
import { Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TransportDetailsManager({
  transport,
  orders = [],
  originToDepotFee = 0,
  initialTab = "overview",
}: {
  transport: any;
  orders?: any[];
  originToDepotFee?: number;
  initialTab?: string;
}) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openLinkOrderDialog, setOpenLinkOrderDialog] = useState(false);
  const [openFinalizeDialog, setOpenFinalizeDialog] = useState(false);
  const [openOrderSelect, setOpenOrderSelect] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(transport.orderId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);

  // Incident form state
  const [lossType, setLossType] = useState("THEFT");
  const [lostQuantity, setLostQuantity] = useState("");
  const [expensesIncurred, setExpensesIncurred] = useState("");
  const [lossComment, setLossComment] = useState("");

  // Return to Truck state
  const [returnTargetDelivery, setReturnTargetDelivery] = useState<any | null>(null);
  const [returnAmount, setReturnAmount] = useState("");
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const handleReturnToTruck = async () => {
    if (!returnTargetDelivery) return;
    const qty = Number(returnAmount);
    if (isNaN(qty) || qty < 0) {
      setReturnError("Please enter a valid volume (0 or greater).");
      return;
    }
    const dispatched = Number(returnTargetDelivery.litersDespatched || returnTargetDelivery.litersSold || 0);
    const received = returnTargetDelivery.litersReceived !== null ? Number(returnTargetDelivery.litersReceived) : 0;
    if (qty + received > dispatched + 0.001) {
      setReturnError(
        `Returned volume (${qty.toLocaleString()} L) + received (${received.toLocaleString()} L) cannot exceed dispatched (${dispatched.toLocaleString()} L).`
      );
      return;
    }

    setIsReturning(true);
    setReturnError(null);

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${returnTargetDelivery.id}`, {
      litersReturned: qty,
    });

    setIsReturning(false);

    if (res.error) {
      setReturnError(res.error.message);
    } else {
      setReturnTargetDelivery(null);
      router.refresh();
    }
  };

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

  const lossLogs = transport.lossLogs || [];
  const carriedVolume = Number(transport.litersCarried) || 0;
  const distributedVolume = (transport.deliveries || []).reduce(
    (acc: number, sale: { litersDespatched?: number | string | null; litersSold?: number | string | null; litersReturned?: number | string | null }) =>
      acc + Math.max(0, (Number(sale.litersDespatched || sale.litersSold) || 0) - (Number(sale.litersReturned) || 0)),
    0
  );
  const loggedLostVolume = lossLogs.reduce(
    (sum: number, log: { lostQuantity?: number | string | null }) => sum + Number(log.lostQuantity || 0),
    0
  );
  const effectiveLoadedVolume = Math.max(carriedVolume, distributedVolume);
  const remainingVolume = Math.max(0, effectiveLoadedVolume - distributedVolume - loggedLostVolume);
  const maxLosableVolume = Math.max(0, effectiveLoadedVolume - loggedLostVolume);
  const ratePerLiter = Number(transport.ratePerLiter) || 0;
  const selectedLossType = getProductLossType(lossType);
  const incidentQuantity = Number(lostQuantity || 0);
  const incidentExpenses = Number(expensesIncurred || 0);
  const exceedsRemaining = incidentQuantity > remainingVolume + 0.001;
  const volumeDeduction = incidentQuantity * ratePerLiter;

  const handleLogIncident = async () => {
    setIsSubmitting(true);
    setError(null);

    const quantity = Number(lostQuantity || 0);
    const expenses = Number(expensesIncurred || 0);
    const selectedType = getProductLossType(lossType);

    if (!lossType || !selectedType) {
      setError("Select an incident type");
      setIsSubmitting(false);
      return;
    }

    if (!lostQuantity || quantity <= 0) {
      setError("Lost quantity must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (incidentQuantity > maxLosableVolume) {
      setError(`Incident quantity cannot exceed ${maxLosableVolume.toLocaleString()} L.`);
      setIsSubmitting(false);
      return;
    }

    if (expenses < 0) {
      setError("Expenses cannot be negative");
      setIsSubmitting(false);
      return;
    }

    if (isNotesRequiredForLossType(lossType) && !lossComment.trim()) {
      setError("Describe what happened — notes are required for this incident type");
      setIsSubmitting(false);
      return;
    }

    const payload: {
      lossLog: {
        lossType: string;
        lostQuantity: number;
        expensesIncurred: number;
        comment?: string;
      };
      addMaintenanceCost: number;
    } = {
      lossLog: {
        lossType,
        lostQuantity: quantity,
        expensesIncurred: expenses,
        comment: lossComment.trim() || undefined,
      },
      addMaintenanceCost: expenses,
    };

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenIncidentDialog(false);
      setLossType("");
      setLostQuantity("");
      setExpensesIncurred("");
      setLossComment("");
      setOpenIncidentDialog(false);
      router.refresh();
    }
  };

  const pendingDeliveries = (transport.deliveries || []).filter(
    (del: any) => del.litersReceived === null || del.litersReceived === undefined
  );
  const isAwaitingReception = pendingDeliveries.length > 0;
  const isAwaitingStationReception = isAwaitingReception;

  // Deliveries that are awaiting reception OR have an issue like variance
  const deliveriesWithIssues = (transport.deliveries || []).filter((del: any) => {
    const isPending = del.litersReceived === null || del.litersReceived === undefined;
    if (isPending) return true;
    const assigned = Number(del.litersDespatched || del.litersSold || 0);
    const received = Number(del.litersReceived);
    return Math.abs(assigned - received) > 0.001;
  });

  const totalReceivedVolume = (transport.deliveries || []).reduce(
    (sum: number, del: any) =>
      sum + (del.litersReceived !== null && del.litersReceived !== undefined ? Number(del.litersReceived) : 0),
    0
  );

  // Shortage on individual confirmed drops (received < dispatched, minus volume returned to truck).
  // Drops flagged "do not deduct from driver" are excluded from the chargeable shortage.
  const deliveryShortage = (transport.deliveries || []).reduce((sum: number, del: any) => {
    if (del.shortageDeducted === false) return sum;
    const dispatched = Math.max(0, Number(del.litersDespatched || del.litersSold || 0) - Number(del.litersReturned || 0));
    if (del.litersReceived !== null && del.litersReceived !== undefined) {
      const received = Number(del.litersReceived);
      const diff = dispatched - received;
      return sum + (diff > 0 ? diff : 0);
    }
    return sum;
  }, 0);

  // Volume loaded on truck that was never dispatched to any recipient or logged lost
  const unaccountedTruckShortage = Math.max(0, carriedVolume - distributedVolume - loggedLostVolume);

  // Total physical shortage across drops and truck volume
  const trueVariance = deliveryShortage + unaccountedTruckShortage;
  const hasActualShortage = !isAwaitingReception && trueVariance > 0.001;
  const canFinalize = transport.status !== "COMPLETED" && transport.status !== "CANCELLED";

  const defaultSellingPrice = transport.deliveries?.length
    ? Math.max(...transport.deliveries.map((d: any) => Number(d.amountPerLiter) || 0))
    : Number(transport.order?.pricePerLiter) || 0;

  // Compute shortage deductions per drop according to that drop's selling price
  const deliveryDeduction = (transport.deliveries || []).reduce((sum: number, del: any) => {
    if (del.shortageDeducted === false) return sum;
    const dispatched = Math.max(0, Number(del.litersDespatched || del.litersSold || 0) - Number(del.litersReturned || 0));
    if (del.litersReceived !== null && del.litersReceived !== undefined) {
      const received = Number(del.litersReceived);
      const diff = dispatched - received;
      if (diff > 0) {
        const price = Number(del.amountPerLiter) || defaultSellingPrice;
        return sum + (diff * price);
      }
    }
    return sum;
  }, 0);

  const totalDeductionAmount = deliveryDeduction + (unaccountedTruckShortage * defaultSellingPrice);
  const sellingPrice = trueVariance > 0 ? Math.round(totalDeductionAmount / trueVariance) : defaultSellingPrice;

  const driverOrTransporterName = transport.isOneTime
    ? (transport.oneTimeDriverName || transport.oneTimeTransporterName || "Driver / Transporter")
    : (transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : transport.transporter?.name || "Driver / Transporter");
  const driverBaseFee = effectiveLoadedVolume * ratePerLiter;
  const driverNetFee = Math.max(0, driverBaseFee - totalDeductionAmount);

  const handleFinalizeWithShortage = async () => {
    if (isAwaitingReception) {
      setError("Cannot finalize trip while deliveries are still awaiting reception.");
      return;
    }

    if (!window.confirm("Are you sure you want to finalize this transport? This action will mark the transport as COMPLETED and cannot be undone.")) return;
    
    setIsFinalizing(true);
    setError(null);

    const payload: Record<string, any> = {
      status: "COMPLETED",
    };

    if (hasActualShortage) {
      const normalDeduction = trueVariance * ratePerLiter;
      const adjustment = Math.max(0, totalDeductionAmount - normalDeduction);

      payload.lossLog = {
        lossType: "SHORTAGE",
        lostQuantity: trueVariance,
        expensesIncurred: adjustment,
        comment: `Final shortage deduction upon transport completion. ${trueVariance.toLocaleString()} L @ ₦${sellingPrice.toLocaleString()}/L deducted from driver/transporter fees.`,
      };
      payload.addMaintenanceCost = adjustment;
    }

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsFinalizing(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenFinalizeDialog(false);
      router.refresh();
    }
  };

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
              {transport.isOneTime ? transport.oneTimeTransporterName : transport.transporter?.name} • {transport.isOneTime ? transport.oneTimeTruckPlate : (transport.truck?.name || "No truck")} • {transport.productType || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canFinalize && (
            isAwaitingStationReception ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950" onClick={() => setOpenFinalizeDialog(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Finalize Transport
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pendingDeliveries.length} destination{pendingDeliveries.length > 1 ? "s" : ""} pending receive confirmation.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : hasActualShortage ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={() => setOpenFinalizeDialog(true)}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Finalize Transport
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Unresolved shortage detected ({trueVariance.toLocaleString()} L). Will be deducted from driver fees.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button onClick={() => setOpenFinalizeDialog(true)}>
                <Check className="h-4 w-4 mr-2" />
                Finalize Transport
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-2xl border bg-card">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Transporter</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.isOneTime ? transport.oneTimeTransporterName : transport.transporter?.name}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Truck</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.isOneTime ? transport.oneTimeTruckPlate : (transport.truck?.name || "Unassigned")}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Driver</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.isOneTime ? transport.oneTimeDriverName : (transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unassigned")}</p>
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
          <Tabs defaultValue={initialTab} className="w-full">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-sm font-medium text-foreground">Delivery Progress</span>
                              <span className="text-sm font-bold text-primary">{Math.round(distributedPercentage)}%</span>
                            </div>
                            <ChartContainer
                              config={{
                                distributed: { label: "Distributed", color: "var(--primary)" },
                                remaining: { label: "Remaining", color: "#f59e0b" },
                                shortage: { label: "Shortage", color: "#ef4444" },
                              }}
                              className="h-48 w-full mb-6 mx-auto flex justify-center"
                            >
                              <PieChart>
                                <ChartTooltip
                                  cursor={false}
                                  content={<ChartTooltipContent indicator="dot" hideLabel />}
                                />
                                <Pie
                                  data={[
                                    { name: "Distributed", value: distributedVolume, fill: "var(--color-distributed)" },
                                    { name: "Remaining", value: remainingVolume, fill: "var(--color-remaining)" },
                                    ...(variance > 0 ? [{ name: "Shortage", value: variance, fill: "var(--color-shortage)" }] : []),
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={30}
                                  outerRadius={60}
                                  paddingAngle={5}
                                  stroke="none"
                                  cornerRadius={4}
                                />
                              </PieChart>
                            </ChartContainer>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Loaded Volume</p>
                                <p className="text-lg font-bold text-foreground leading-none">{carriedVolume.toLocaleString()} L</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Distributed</p>
                                <p className="text-lg font-bold text-foreground leading-none">{distributedVolume.toLocaleString()} L</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Remaining</p>
                                <div className="flex flex-col gap-1">
                                  <p className="text-lg font-bold text-foreground leading-none">{remainingVolume.toLocaleString()} L</p>
                                  {loggedLostVolume > 0 && <span className="text-[10px] text-destructive leading-none font-medium mt-0.5">{loggedLostVolume.toLocaleString()} L logged as lost</span>}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full mt-1", variance > 0 ? "bg-destructive" : "bg-emerald-500")} />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Shortage (Variance)</p>
                                <div className="flex items-end gap-1.5">
                                  <p className={cn("text-lg font-bold leading-none", variance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500")}>
                                    {variance.toLocaleString()} L
                                  </p>
                                  {variance > 0 && (
                                    <span className="text-[10px] font-medium text-destructive leading-none mb-0.5">({variancePercentage.toFixed(2)}%)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="">
                          <AssetTank 
                            layout="fleet"
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

              {transport.comment ? (
                <div className="p-5 rounded-2xl border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Trip Notes</p>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{transport.comment}</p>
                </div>
              ) : null}

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
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Cost</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!transport.deliveries || transport.deliveries.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
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
                                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                      <span className="text-[10px] text-destructive font-medium uppercase">
                                        Shortfall: {(Number(sale.litersDespatched || sale.litersSold) - Number(sale.litersReceived)).toLocaleString()} L
                                      </span>
                                      {Number(sale.litersReturned || 0) > 0 && (
                                        <span className="text-[10px] text-blue-600 font-medium uppercase">
                                          ({Number(sale.litersReturned).toLocaleString()} L in Truck)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium text-amber-600 dark:text-amber-500">Pending</span>
                              )}
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-mono text-xs">₦{Number(sale.amountPerLiter || 0).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90">
                              <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="text-[10px]">
                                {sale.transportCostBorneBy === 'COMPANY' ? 'COMPANY' : 'CLIENT'}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {sale.litersReceived !== null &&
                                  Number(sale.litersDespatched || sale.litersSold) > Number(sale.litersReceived) &&
                                  transport.status !== "COMPLETED" &&
                                  transport.status !== "CANCELLED" && (
                                    <Button
                                      variant={Number(sale.litersReturned || 0) > 0 ? "secondary" : "outline"}
                                      size="sm"
                                      className={cn(
                                        "h-8 text-xs font-medium",
                                        Number(sale.litersReturned || 0) > 0 && "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                      )}
                                      onClick={() => {
                                        setReturnTargetDelivery(sale);
                                        const unreceived = Math.max(0, Number(sale.litersDespatched || sale.litersSold || 0) - Number(sale.litersReceived || 0));
                                        const curRet = Number(sale.litersReturned || 0);
                                        setReturnAmount(curRet > 0 ? curRet.toString() : unreceived.toString());
                                        setReturnError(null);
                                      }}
                                      title="Return unreceived volume to truck"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                      {Number(sale.litersReturned || 0) > 0 ? `${Number(sale.litersReturned).toLocaleString()} L in Truck` : "Return to Truck"}
                                    </Button>
                                  )}
                                <Button variant="outline" size="icon" title="Print Waybill" asChild>
                                  <Link href={`/admin/deliveries/${sale.id}/print?from=transport`} target="_blank">
                                    <Printer className="w-4 h-4" />
                                  </Link>
                                </Button>
                              </div>
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
                        <td></td>
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
                  <p className="text-sm text-muted-foreground">
                    Product lost in transit — theft, accident, spill, leakage, or contamination. Truck repairs belong in Payments & Expenses.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => { setError(null); setOpenIncidentDialog(true); }}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Log Incident or Loss
                </Button>
              </div>
              {lossLogs.length === 0 ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No product losses recorded for this trip.</p>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Incident</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Notes</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Lost (L)</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Expenses (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lossLogs.map((log: { id: string; createdAt: string; lossType: string; comment?: string | null; lostQuantity?: number | string | null; expensesIncurred?: number | string | null }) => (
                        <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{getLossTypeLabel(log.lossType)}</div>
                            {getProductLossType(log.lossType)?.summary && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {getProductLossType(log.lossType)?.summary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground/90 max-w-[280px] truncate" title={log.comment || ""}>
                            {log.comment || "—"}
                          </td>
                          <td className="text-right py-3 px-4 text-destructive font-medium">
                            {Number(log.lostQuantity || 0).toLocaleString()} L
                          </td>
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium font-mono text-destructive">
                            {Number(log.expensesIncurred || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border/50 font-bold">
                        <td colSpan={3} className="text-right py-3 px-4 text-foreground">Total product loss:</td>
                        <td className="text-right py-3 px-4 text-destructive">
                          {loggedLostVolume.toLocaleString()} L
                        </td>
                        <td className="text-right py-3 px-4 text-destructive font-mono text-base">
                          {(() => {
                            const totalExpenses = lossLogs.reduce(
                              (sum: number, log: { expensesIncurred?: number | string | null }) => sum + Number(log.expensesIncurred || 0),
                              0
                            );
                            return `₦${totalExpenses.toLocaleString()}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
                              <FilePreviewButton
                                fileUrl={txn.receiptUrl}
                                fileName={`Payment Receipt - ${txn.reference || txn.id.substring(0, 8).toUpperCase()}`}
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs font-medium text-primary hover:underline"
                                label="View"
                              />
                            ) : (
                              "—"
                            )}
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
      <Dialog
        open={openIncidentDialog}
        onOpenChange={(open) => {
          setOpenIncidentDialog(open);
          if (open) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Log Product Loss
            </DialogTitle>
            <DialogDescription>
              Record product lost on this trip. Lost litres are deducted from remaining volume and from transporter earnings at ₦{ratePerLiter.toLocaleString()}/L. Truck repairs belong in Payments & Expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What happened</Label>
              <Select value={lossType} onValueChange={setLossType}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedLossType?.label ?? "Select what happened"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_LOSS_TYPES.filter((type) => type.value !== "SHORTAGE").map((type) => (
                    <SelectItem key={type.value} value={type.value} textValue={type.label}>
                      <span className="flex flex-col items-start gap-0.5 py-0.5">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground font-normal whitespace-normal">
                          {type.summary}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLossType && (
                <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/40 p-3">
                  {selectedLossType.guidance}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lost quantity (L)*</Label>
                <FormattedNumberInput min="0" value={lostQuantity} onChange={(e) => setLostQuantity(e.target.value)} placeholder="0" prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />} />
                <p className="text-[11px] text-muted-foreground">
                  Remaining on truck: {remainingVolume.toLocaleString()} L of {carriedVolume.toLocaleString()} L loaded
                </p>
                {exceedsRemaining && incidentQuantity <= maxLosableVolume && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500">
                    This is more than the remaining {remainingVolume.toLocaleString()} L on the truck. Continue only if deliveries were recorded before this incident.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{selectedLossType?.expenseLabel ?? "Incident expenses (₦)"}</Label>
                <FormattedNumberInput min="0" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" prefixText="₦" />
                <p className="text-[11px] text-muted-foreground">
                  {selectedLossType?.expenseHint ?? "Costs tied to this product loss, not vehicle repairs."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Notes{selectedLossType?.notesRequired ? "*" : ""}
              </Label>
              <Textarea
                value={lossComment}
                onChange={(e) => setLossComment(e.target.value)}
                placeholder={selectedLossType?.notesPlaceholder ?? "Explain what happened..."}
              />
            </div>

            {incidentQuantity > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Impact on this trip</p>
                <p>Product deducted: {incidentQuantity.toLocaleString()} L</p>
                <p>Transporter volume deduction: ₦{volumeDeduction.toLocaleString()}</p>
                {incidentExpenses > 0 && (
                  <p>Incident expenses deducted: ₦{incidentExpenses.toLocaleString()}</p>
                )}
              </div>
            )}

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

      {/* Finalize Transport Dialog */}
      <Dialog open={openFinalizeDialog} onOpenChange={setOpenFinalizeDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Finalize Transport
            </DialogTitle>
            <DialogDescription>
              {isAwaitingReception
                ? "This transport has deliveries awaiting reception. All destination stations and clients must confirm receipt before you can finalize and reconcile variance."
                : "Review the delivery distribution before marking this transport as complete."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {isAwaitingReception ? (
              /* --- STATE 1: PENDING DESTINATIONS GATE --- */
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                        Destination Pending Receive ({pendingDeliveries.length})
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        The destination station(s) or client(s) below have not yet confirmed their received volume. You can only determine if there is a shortage after all recipients have received their product.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Delivery / Destination</TableHead>
                        <TableHead className="text-right">Dispatched Volume</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveriesWithIssues.map((del: any) => {
                        const isPending = del.litersReceived === null || del.litersReceived === undefined;
                        const assigned = Number(del.litersDespatched || del.litersSold || 0);
                        const received = !isPending ? Number(del.litersReceived) : null;
                        const diff = received !== null ? assigned - received : 0;
                        return (
                          <TableRow key={del.id}>
                            <TableCell className="font-medium text-foreground">
                              {del.customer ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{del.customer.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">External Client</span>
                                </div>
                              ) : del.station ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{del.station.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">Owned Station</span>
                                </div>
                              ) : (
                                "Unknown Destination"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {assigned.toLocaleString()} L
                            </TableCell>
                            <TableCell className="text-right">
                              {isPending ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/50 text-xs"
                                >
                                  Pending Receive
                                </Badge>
                              ) : diff > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/50 text-xs"
                                >
                                  Shortage ({diff.toLocaleString()} L)
                                </Badge>
                              ) : diff < 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/50 text-xs"
                                >
                                  Surplus ({Math.abs(diff).toLocaleString()} L)
                                </Badge>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              /* --- STATE 2: ALL RECIPIENTS RECEIVED --- */
              <div className="space-y-6">
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Delivery / Destination</TableHead>
                        <TableHead className="text-right">Assigned</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveriesWithIssues.length ? (
                        deliveriesWithIssues.map((del: any) => {
                          const assigned = Number(del.litersDespatched || del.litersSold || 0);
                          const received = del.litersReceived !== null && del.litersReceived !== undefined ? Number(del.litersReceived) : null;
                          const diff = received !== null ? assigned - received : 0;
                          return (
                            <TableRow key={del.id}>
                              <TableCell className="font-medium">
                                {del.customer ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">{del.customer.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">External Client</span>
                                  </div>
                                ) : del.station ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">{del.station.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">Owned Station</span>
                                  </div>
                                ) : (
                                  "Unknown Destination"
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">{assigned.toLocaleString()} L</TableCell>
                              <TableCell className="text-right font-mono font-medium text-emerald-600 dark:text-emerald-500">
                                {received !== null ? `${received.toLocaleString()} L` : "Pending"}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-mono font-medium",
                                  diff > 0 ? "text-rose-600" : diff < 0 ? "text-emerald-600" : "text-muted-foreground"
                                )}
                              >
                                {received !== null ? `${diff > 0 ? "+" : ""}${diff.toLocaleString()} L` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            All destinations confirmed with zero variance.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <tfoot className="bg-muted/50">
                      <TableRow>
                        <TableCell className="font-bold">Total Dispatched / Received</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {distributedVolume.toLocaleString()} L
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-emerald-600 dark:text-emerald-500">
                          {totalReceivedVolume.toLocaleString()} L
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {trueVariance > 0 ? (
                            <span className="text-rose-600">-{trueVariance.toLocaleString()} L</span>
                          ) : (
                            <span className="text-emerald-600">0 L</span>
                          )}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
                      Loaded / Dispatched
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {effectiveLoadedVolume.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">L</span>
                    </p>
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-xl border",
                      hasActualShortage
                        ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50"
                        : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                    )}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
                      {hasActualShortage ? "Shortage (Variance)" : "Delivery Status"}
                    </p>
                    <p
                      className={cn(
                        "text-xl font-bold font-mono",
                        hasActualShortage ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {hasActualShortage
                        ? `${trueVariance.toLocaleString()} L`
                        : "100% Received"}
                    </p>
                  </div>
                </div>

                {hasActualShortage ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <h4>Shortage Variance Detected</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-card border text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Shortage Volume</span>
                        <span className="font-bold text-destructive text-sm font-mono">{trueVariance.toLocaleString()} L</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Amount Sold / L</span>
                        <span className="font-bold text-foreground text-sm font-mono">₦{sellingPrice.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Deduction</span>
                        <span className="font-bold text-destructive text-sm font-mono">₦{totalDeductionAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Notice on Driver Fees */}
                    <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs space-y-1.5">
                      <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Driver Transport Fee Deduction Notice</span>
                      </p>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        This shortage deduction of <strong>₦{totalDeductionAmount.toLocaleString()}</strong> will be deducted from the transport fees of <strong>{driverOrTransporterName}</strong>.
                      </p>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/60 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Gross Haulage Fee</span>
                          <span className="font-mono font-medium">₦{driverBaseFee.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-destructive block text-[10px]">Shortage Deduction</span>
                          <span className="font-mono font-bold text-destructive">- ₦{totalDeductionAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Net Payout to Driver</span>
                          <span className="font-mono font-bold text-foreground">₦{driverNetFee.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <Button variant="outline" className="w-full sm:w-auto" asChild>
                        <Link href={`/admin/deliveries/new?transportId=${transport.id}`}>
                          Assign to another destination
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={handleFinalizeWithShortage}
                        disabled={isFinalizing}
                      >
                        {isFinalizing ? <SpinnerEllipsis /> : "Confirm Shortage & Finalize"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                        Zero Shortage — 100% Volume Accounted For
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        All loaded product has been fully received at the destination(s). No shortage deductions will be applied to the driver&apos;s transport fees.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter>
            {isAwaitingStationReception ? (
              <Button variant="outline" onClick={() => setOpenFinalizeDialog(false)}>
                Close
              </Button>
            ) : !hasActualShortage ? (
              <>
                <Button variant="outline" onClick={() => setOpenFinalizeDialog(false)} disabled={isFinalizing}>
                  Cancel
                </Button>
                <Button onClick={handleFinalizeWithShortage} disabled={isFinalizing}>
                  {isFinalizing ? <SpinnerEllipsis /> : "Complete Transport"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setOpenFinalizeDialog(false)} disabled={isFinalizing}>
                Cancel
              </Button>
            )}
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

      {/* Return to Truck Dialog */}
      <Dialog
        open={Boolean(returnTargetDelivery)}
        onOpenChange={(val) => {
          if (!isReturning && !val) setReturnTargetDelivery(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Return Volume to Truck Tank
            </DialogTitle>
            <DialogDescription>
              Assign unreceived volume from delivery to{" "}
              <strong className="text-foreground">
                {returnTargetDelivery?.customer?.name || returnTargetDelivery?.station?.name || "Recipient"}
              </strong>{" "}
              back into the truck tank.
            </DialogDescription>
          </DialogHeader>

          {returnTargetDelivery && (() => {
            const dispatched = Number(returnTargetDelivery.litersDespatched || returnTargetDelivery.litersSold || 0);
            const received = returnTargetDelivery.litersReceived !== null ? Number(returnTargetDelivery.litersReceived) : 0;
            const unreceived = Math.max(0, dispatched - received);

            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border bg-muted/30 text-xs">
                  <div>
                    <p className="text-muted-foreground uppercase text-[10px] font-semibold">Dispatched</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{dispatched.toLocaleString()} L</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase text-[10px] font-semibold">Received</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{received.toLocaleString()} L</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase text-[10px] font-semibold">Shortfall</p>
                    <p className="text-sm font-semibold text-rose-600 mt-0.5">{unreceived.toLocaleString()} L</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="transportReturnAmount" className="text-sm font-medium">
                      Volume to Return to Truck (L)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => {
                        setReturnAmount(unreceived.toString());
                        if (returnError) setReturnError(null);
                      }}
                    >
                      Max ({unreceived.toLocaleString()} L)
                    </Button>
                  </div>

                  <FormattedNumberInput
                    id="transportReturnAmount"
                    min="0"
                    placeholder={`e.g. ${unreceived}`}
                    value={returnAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setReturnAmount(e.target.value);
                      if (returnError) setReturnError(null);
                    }}
                    prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                  />
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    This volume remains physically on the truck (e.g. station tank was full). It becomes available for reassignment to another station or customer, and will <strong>not</strong> be deducted as a loss from the driver.
                  </p>
                </div>

                {returnError && <p className="text-xs font-medium text-destructive">{returnError}</p>}
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReturnTargetDelivery(null)}
              disabled={isReturning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReturnToTruck}
              disabled={isReturning || returnAmount.trim() === ""}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isReturning ? <SpinnerEllipsis /> : "Confirm Return to Truck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
