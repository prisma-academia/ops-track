"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, apiDelete } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Truck, AlertTriangle, CheckCircle, CheckCircle2, Clock, Droplets, FileText, Link2, ChevronsUpDown, Printer, Check, Trash2, XCircle, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDestination } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { AssetTank } from "@/components/asset-tank";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Droplet } from "lucide-react";
import { TransportFeeBreakdown, getTransactionFeeLegLabel } from "@/components/fleet/transport-fee-breakdown";
import { PRODUCT_LOSS_TYPES, getLossTypeLabel, getProductLossType, isNotesRequiredForLossType } from "@/lib/fleet/loss-types";
import {
  formatTransportStatusLabel,
  isCompleteTransportLoadLoss,
} from "@/lib/fleet/transport-loss";
import {
  computeRemainingInTransport,
  deliveryCommitted,
  deliveryShortfall,
  volumeAccountedOutOfTruck,
} from "@/lib/fleet/transport-volume";
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

  // Delete Loss Log state
  const [deleteLossTarget, setDeleteLossTarget] = useState<any | null>(null);
  const [isDeletingLoss, setIsDeletingLoss] = useState(false);

  const handleDeleteLossLog = async () => {
    if (!deleteLossTarget) return;
    setIsDeletingLoss(true);
    try {
      const res = await apiDelete(`/api/tenant/fleet/transports/${transport.id}/losses/${deleteLossTarget.id}`);
      if (res.error) {
        toast.error(res.error.message || "Failed to delete loss incident log.");
      } else {
        toast.success("Loss incident log deleted. Tank volume and deductions updated.");
        setDeleteLossTarget(null);
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsDeletingLoss(false);
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
  const deliveryRows = (transport.deliveries || []) as {
    litersDespatched?: number | string | null;
    litersSold?: number | string | null;
    litersReturned?: number | string | null;
    litersReceived?: number | string | null;
  }[];
  const normalizedDeliveries = deliveryRows.map((sale, index) => ({
    litersDespatched: sale.litersDespatched ?? sale.litersSold,
    litersReturned: sale.litersReturned,
    litersReceived: sale.litersReceived,
    shortageDeducted: (transport.deliveries || [])[index]?.shortageDeducted,
  }));
  const distributedVolume = normalizedDeliveries.reduce(
    (acc, sale) => acc + deliveryCommitted(sale),
    0
  );
  const deliveredOutOfTruckVolume = normalizedDeliveries.reduce(
    (acc, sale) => acc + volumeAccountedOutOfTruck(sale),
    0
  );
  const loggedLostVolume = lossLogs.reduce(
    (sum: number, log: { lostQuantity?: number | string | null }) => sum + Number(log.lostQuantity || 0),
    0
  );
  const effectiveLoadedVolume = Math.max(carriedVolume, distributedVolume);
  const remainingVolume = computeRemainingInTransport({
    litersCarried: carriedVolume,
    deliveries: normalizedDeliveries,
    loggedLost: loggedLostVolume,
  });
  const maxLosableVolume = Math.max(0, effectiveLoadedVolume - loggedLostVolume);
  const ratePerLiter = Number(transport.ratePerLiter) || 0;
  const selectedLossType = getProductLossType(lossType);
  const incidentQuantity = Number(lostQuantity || 0);
  const incidentExpenses = Number(expensesIncurred || 0);
  const exceedsRemaining = incidentQuantity > remainingVolume + 0.001;
  const volumeDeduction = incidentQuantity * ratePerLiter;

  const isCompleteLoadLoss = isCompleteTransportLoadLoss({
    litersCarried: carriedVolume,
    effectiveLoadedVolume,
    distributedVolume,
    loggedLostVolume,
  });

  const primaryLossLog =
    lossLogs.length > 0
      ? [...lossLogs].sort(
          (a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      : null;

  const completeLossFinancialTotal =
    loggedLostVolume * ratePerLiter +
    lossLogs.reduce(
      (sum: number, log: { expensesIncurred?: number | string | null }) =>
        sum + Number(log.expensesIncurred || 0),
      0
    );

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

    const willCompleteLoadLoss =
      distributedVolume < 0.001 &&
      quantity + loggedLostVolume >= effectiveLoadedVolume - 0.001;

    const payload: {
      lossLog: {
        lossType: string;
        lostQuantity: number;
        expensesIncurred: number;
        comment?: string;
      };
      addMaintenanceCost: number;
      status?: string;
    } = {
      lossLog: {
        lossType,
        lostQuantity: quantity,
        expensesIncurred: expenses,
        comment: lossComment.trim() || undefined,
      },
      addMaintenanceCost: expenses,
    };

    if (willCompleteLoadLoss) {
      payload.status = "LOSS";
    }

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
      if (willCompleteLoadLoss) {
        toast.success("Complete load loss recorded. Trip marked as Complete Loss.");
      } else {
        toast.success("Product loss incident logged.");
      }
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
  const deliveryShortage = normalizedDeliveries.reduce((sum, del) => {
    if (del.shortageDeducted === false) return sum;
    return sum + deliveryShortfall(del);
  }, 0);

  // Fuel still on the truck (after deliveries, returns, and logged loss)
  const unaccountedTruckShortage = remainingVolume;

  // Total physical shortage across drops and truck volume
  const trueVariance = deliveryShortage + unaccountedTruckShortage;
  const hasActualShortage = !isAwaitingReception && trueVariance > 0.001;
  const canFinalize =
    transport.status !== "COMPLETED" &&
    transport.status !== "CANCELLED" &&
    transport.status !== "LOSS";

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

  const handleOpenFinalizeDialog = () => {
    setError(null);
    setOpenFinalizeDialog(true);
  };

  const productLossLogs = [...lossLogs]
    .filter((log: { lossType?: string }) => log.lossType !== "SHORTAGE")
    .sort(
      (a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const shortageLossLogs = [...lossLogs].filter(
    (log: { lossType?: string }) => log.lossType === "SHORTAGE"
  );
  const loggedIncidentLiters = productLossLogs.reduce(
    (sum: number, log: { lostQuantity?: number | string }) => sum + Number(log.lostQuantity || 0),
    0
  );
  const loggedIncidentExpenses = productLossLogs.reduce(
    (sum: number, log: { expensesIncurred?: number | string }) =>
      sum + Number(log.expensesIncurred || 0),
    0
  );
  const purchasePricePerLitre = Number(transport.order?.pricePerLitre) || 0;
  const loggedIncidentProductValue = loggedIncidentLiters * purchasePricePerLitre;

  const volumeBalanceDelta = Math.abs(
    carriedVolume - loggedLostVolume - deliveredOutOfTruckVolume
  );
  const volumeBalances = volumeBalanceDelta < 1;

  // Compute live breakdown based on deliveries' logged status
  let modalTransitShortage = 0;
  let modalShortageDeductionAmount = 0;

  (transport.deliveries || []).forEach((del: any) => {
    if (del.litersReceived === null || del.litersReceived === undefined) return;
    if (del.shortageDeducted === false) return;
    const assigned = Number(del.litersDespatched || del.litersSold || 0);
    const received = Number(del.litersReceived);
    const returned = Number(del.litersReturned || 0);
    const shortage = Math.max(0, assigned - returned - received);
    if (shortage > 0.001) {
      modalTransitShortage += shortage;
      const price = Number(del.amountPerLiter) || defaultSellingPrice;
      modalShortageDeductionAmount += shortage * price;
    }
  });

  const modalRemainingInTruck = remainingVolume;
  const modalSellingPrice =
    modalTransitShortage > 0
      ? Math.round(modalShortageDeductionAmount / modalTransitShortage)
      : defaultSellingPrice;

  const modalShortageFeeDeduction =
    modalTransitShortage > 0.001
      ? ratePerLiter > 0
        ? modalTransitShortage * ratePerLiter
        : modalShortageDeductionAmount
      : 0;

  const modalDeliveryVariance = normalizedDeliveries.reduce(
    (sum, item) => sum + deliveryShortfall(item),
    0
  );

  const finalizeVolumeStatCards = [
    {
      key: "remaining",
      title: "Remaining",
      value: `${modalRemainingInTruck.toLocaleString()} L`,
      tooltip: `${modalRemainingInTruck.toLocaleString()} L on truck`,
      subtitle:
        modalRemainingInTruck > 0.001
          ? "Must be zero to close"
          : "Tank empty",
      dotColor: "bg-amber-500",
    },
    {
      key: "shortage",
      title: "Shortage",
      value: `${modalTransitShortage.toLocaleString()} L`,
      tooltip: `${modalTransitShortage.toLocaleString()} L chargeable shortfall`,
      subtitle:
        modalTransitShortage > 0.001
          ? `₦${modalShortageFeeDeduction.toLocaleString()} from transport fee`
          : modalDeliveryVariance > 0.001
            ? `${modalDeliveryVariance.toLocaleString()} L delivery variance (not deducted)`
            : "No chargeable shortfall",
      dotColor: "bg-yellow-500",
    },
    {
      key: "loss",
      title: "Loss",
      value: `${loggedIncidentLiters.toLocaleString()} L`,
      tooltip: `${loggedIncidentLiters.toLocaleString()} L product loss logged`,
      subtitle:
        loggedIncidentLiters > 0
          ? `₦${(loggedIncidentProductValue + loggedIncidentExpenses).toLocaleString()} impact`
          : "No product-loss incidents",
      dotColor: "bg-red-500",
    },
  ];

  const finalizeChecks = [
    {
      id: "reception",
      label: "All deliveries confirmed",
      detail: isAwaitingReception
        ? `${pendingDeliveries.length} destination(s) still awaiting reception — confirm received volumes first.`
        : "Every drop has a logged received quantity.",
      pass: !isAwaitingReception,
    },
    {
      id: "truck",
      label: "No fuel left on truck",
      detail:
        modalRemainingInTruck > 0.001
          ? `${modalRemainingInTruck.toLocaleString()} L is still on the truck. Deliver it, re-assign it, or log product loss on the trip before closing.`
          : "Tank is empty — all loaded volume is delivered or logged as loss.",
      pass: modalRemainingInTruck <= 0.001,
    },
    {
      id: "balance",
      label: "Load reconciles",
      detail: `Loaded ${carriedVolume.toLocaleString()} L = ${deliveredOutOfTruckVolume.toLocaleString()} L delivered + ${loggedLostVolume.toLocaleString()} L logged loss.`,
      pass: volumeBalances,
    },
    {
      id: "incidents",
      label: "Loss incidents",
      detail:
        productLossLogs.length > 0
          ? `${productLossLogs.length} product-loss record(s) · ${loggedIncidentLiters.toLocaleString()} L · ₦${loggedIncidentExpenses.toLocaleString()} expenses`
          : loggedLostVolume > 0
            ? `${loggedLostVolume.toLocaleString()} L recorded as loss on this trip.`
            : "No separate product-loss log — use Product Loss on the trip if litres were lost.",
      pass: true,
    },
  ];

  const canFinalizeNow = finalizeChecks.every((check) => check.pass);

  const handleFinalizeTransport = async () => {
    if (!canFinalizeNow) {
      setError("Resolve every readiness check before finalizing this transport.");
      return;
    }

    const closingAsLoss = isCompleteLoadLoss;
    const needsShortageLog =
      !closingAsLoss &&
      modalTransitShortage > 0.001 &&
      !shortageLossLogs.some(
        (log: { lostQuantity?: number | string }) =>
          Math.abs(Number(log.lostQuantity || 0) - modalTransitShortage) < 0.01
      );

    const confirmMessage = closingAsLoss
      ? "Close this trip as a complete loss? This cannot be undone."
      : needsShortageLog
        ? `Finalize and record ${modalTransitShortage.toLocaleString()} L shortage deduction (₦${modalShortageFeeDeduction.toLocaleString()} from transport fee)?`
        : "Mark this transport as completed? This cannot be undone.";
    if (!window.confirm(confirmMessage)) return;

    setIsFinalizing(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        status: closingAsLoss ? "LOSS" : "COMPLETED",
      };

      if (needsShortageLog) {
        payload.lossLog = {
          lossType: "SHORTAGE",
          lostQuantity: modalTransitShortage,
          expensesIncurred: 0,
          comment: `Shortage deduction on finalize. ${modalTransitShortage.toLocaleString()} L at ₦${ratePerLiter.toLocaleString()}/L transport rate.`,
        };
      }

      const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
      setIsFinalizing(false);

      if (res.error) {
        setError(res.error.message);
      } else {
        setOpenFinalizeDialog(false);
        toast.success(
          closingAsLoss ? "Transport closed as complete loss." : "Transport finalized successfully."
        );
        router.refresh();
      }
    } catch (err: unknown) {
      setIsFinalizing(false);
      setError(err instanceof Error ? err.message : "An unexpected error occurred while finalizing.");
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
              Trip to {formatDestination(transport.destination)}
              <Badge
                variant={
                  transport.status === "LOSS"
                    ? "destructive"
                    : transport.status === "COMPLETED"
                      ? "default"
                      : transport.status === "CANCELLED"
                        ? "secondary"
                        : "outline"
                }
                className={transport.status === "LOSS" ? "bg-rose-600 text-white hover:bg-rose-600" : ""}
              >
                {formatTransportStatusLabel(transport.status)}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {transport.isOneTime ? transport.oneTimeTransporterName : transport.transporter?.name} • {transport.isOneTime ? transport.oneTimeTruckPlate : (transport.truck?.plateNumber || transport.truck?.name || "No truck")} • {transport.productType || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canFinalize && (
            isAwaitingStationReception ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950" onClick={handleOpenFinalizeDialog}>
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
                    <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={handleOpenFinalizeDialog}>
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
              <Button onClick={handleOpenFinalizeDialog}>
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
          <p className="text-sm font-medium text-foreground mt-0.5">
            {(() => {
              const raw = transport.isOneTime ? transport.oneTimeTransporterName : transport.transporter?.name;
              return raw && raw.toLowerCase() !== "unknown" ? raw : "Unassigned";
            })()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Truck</p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {(() => {
              const raw = transport.isOneTime
                ? transport.oneTimeTruckPlate
                : (transport.truck?.plateNumber || transport.truck?.name || transport.truck?.truckNumber);
              return raw && raw.toLowerCase() !== "unknown" ? raw : "Unassigned";
            })()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Driver</p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {(() => {
              const raw = transport.isOneTime
                ? transport.oneTimeDriverName
                : (transport.driver ? `${transport.driver.firstName || ""} ${transport.driver.lastName || ""}`.trim() : null);
              return raw && raw.toLowerCase() !== "unknown" ? raw : "Unassigned";
            })()}
          </p>
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
                  const variance = normalizedDeliveries.reduce(
                    (sum, item) => sum + deliveryShortfall(item),
                    0
                  );

                  const variancePercentage = carriedVolume > 0 ? (variance / carriedVolume) * 100 : 0;
                  const deliverableBase = Math.max(0, carriedVolume - loggedLostVolume);
                  const distributedPercentage =
                    deliverableBase > 0 ? (deliveredOutOfTruckVolume / deliverableBase) * 100 : 0;

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
                                    { name: "Delivered", value: deliveredOutOfTruckVolume, fill: "var(--color-distributed)" },
                                    ...(loggedLostVolume > 0
                                      ? [{ name: "Lost", value: loggedLostVolume, fill: "var(--color-shortage)" }]
                                      : []),
                                    { name: "On truck", value: remainingVolume, fill: "var(--color-remaining)" },
                                    ...(variance > 0
                                      ? [{ name: "Shortage", value: variance, fill: "var(--color-shortage)" }]
                                      : []),
                                  ].filter((slice) => slice.value > 0.001)}
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
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Delivered</p>
                                <p className="text-lg font-bold text-foreground leading-none">{deliveredOutOfTruckVolume.toLocaleString()} L</p>
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
                                <Button variant="outline" size="icon" title="Print Waybill" asChild>
                                  <Link href={`/admin/deliveries/${sale.id}/waybill?from=transport`} target="_blank">
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
                {canFinalize && (
                  <Button variant="destructive" onClick={() => { setError(null); setOpenIncidentDialog(true); }}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Log Incident or Loss
                  </Button>
                )}
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
                        {canFinalize && (
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground w-16">Action</th>
                        )}
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
                          {canFinalize && (
                            <td className="text-right py-3 px-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteLossTarget(log)}
                                title="Delete loss log"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
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
                        {canFinalize && <td className="py-3 px-4" />}
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
                <SelectContent position="popper">
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
              {/* {selectedLossType && (
                <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/40 p-3">
                  {selectedLossType.guidance}
                </p>
              )} */}
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
      <Dialog
        open={openFinalizeDialog}
        onOpenChange={(open) => {
          setOpenFinalizeDialog(open);
          if (!open) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isCompleteLoadLoss ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Scale className="h-5 w-5 text-primary" />
              )}
              {isCompleteLoadLoss ? "Close complete loss trip" : "Finalize transport"}
            </DialogTitle>
            <DialogDescription>
              Review the trip summary below. Product loss must already be logged on this transport — nothing new is
              added here except an automatic shortage deduction when applicable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {isCompleteLoadLoss && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <p className="font-semibold text-destructive">Complete load loss</p>
                <p className="text-muted-foreground mt-1">
                  {loggedLostVolume.toLocaleString()} L logged as lost
                  {primaryLossLog ? ` (${getLossTypeLabel(primaryLossLog.lossType)})` : ""}. Closing will mark the trip
                  as <span className="font-medium text-foreground">LOSS</span>, not completed delivery.
                </p>
                <p className="font-mono text-sm font-semibold text-destructive mt-2">
                  Impact: ₦{completeLossFinancialTotal.toLocaleString()}
                </p>
              </div>
            )}

            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {finalizeVolumeStatCards.map((stat) => (
                  <Tooltip key={stat.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-default select-none border-border/60 bg-muted/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", stat.dotColor)} />
                        </div>
                        <div className="mt-2 text-base font-bold text-foreground tracking-tight font-mono">
                          {stat.value}
                        </div>
                        {stat.subtitle ? (
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{stat.subtitle}</p>
                        ) : null}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                      {stat.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Readiness checks
              </p>
              <ul className="space-y-2.5">
                {finalizeChecks.map((check) => (
                  <li key={check.id} className="flex gap-3 items-start">
                    {check.pass ? (
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{check.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Driver transport fee (reference):</span>{" "}
              ₦{(effectiveLoadedVolume * ratePerLiter).toLocaleString()} gross
              {totalDeductionAmount > 0 && (
                <>
                  {" "}
                  · <span className="text-rose-600">₦{totalDeductionAmount.toLocaleString()} deductions</span> · Net ₦
                  {driverNetFee.toLocaleString()}
                </>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenFinalizeDialog(false)} disabled={isFinalizing}>
              Cancel
            </Button>
            <Button
              onClick={handleFinalizeTransport}
              disabled={!canFinalizeNow || isFinalizing}
              className={cn(
                (isCompleteLoadLoss || modalTransitShortage > 0.001) &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isFinalizing ? (
                <SpinnerEllipsis />
              ) : isCompleteLoadLoss ? (
                "Close as loss"
              ) : modalTransitShortage > 0.001 ? (
                "Finalize with shortage deduction"
              ) : (
                "Complete transport"
              )}
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



      {/* Delete Loss Incident Confirmation Dialog */}
      <AlertDialog open={!!deleteLossTarget} onOpenChange={(open) => !open && setDeleteLossTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Loss Incident Log
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-foreground/80">
                <p>
                  Are you sure you want to delete this <strong>{deleteLossTarget ? getLossTypeLabel(deleteLossTarget.lossType) : "loss"}</strong> incident log?
                </p>
                {deleteLossTarget && (
                  <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-1.5 my-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume Lost:</span>
                      <span className="font-semibold text-destructive">{Number(deleteLossTarget.lostQuantity || 0).toLocaleString()} L</span>
                    </div>
                    {Number(deleteLossTarget.expensesIncurred || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expenses Incurred:</span>
                        <span className="font-semibold font-mono text-destructive">₦{Number(deleteLossTarget.expensesIncurred || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {deleteLossTarget.comment && (
                      <div className="pt-1.5 text-muted-foreground border-t border-border/50 italic">
                        &quot;{deleteLossTarget.comment}&quot;
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Deleting this log will restore <strong>{Number(deleteLossTarget?.lostQuantity || 0).toLocaleString()} L</strong> back to the truck&apos;s available capacity and reverse associated financial deductions.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLoss}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLossLog();
              }}
              disabled={isDeletingLoss}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeletingLoss ? <SpinnerEllipsis /> : "Delete Incident"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
