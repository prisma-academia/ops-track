"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DataTableProps } from "@/components/data-table";
import {
  DataTableFilterDrawer,
  type FilterConfig,
} from "@/components/data-table-filter-drawer";
import {
  Building2,
  Droplet,
  FileText,
  List,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
export type DeliveriesListView = "stations" | "b2b";
import { DeliveryCollectionProgressRing } from "@/components/fleet/delivery-collection-progress-ring";
import { BadgePercentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiPatch } from "@/lib/client/api";
import { useRouter, useSearchParams } from "next/navigation";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

export type SaleRow = {
  id: string;
  stationId?: string | null;
  customerName: string;
  transportDetails: string;
  litersDespatched: number;
  litersReceived: number | null;
  litersReturned: number;
  shortageDeducted: boolean;
  variance: number | null;
  amountPerLiter: number;
  totalExpectedAmount: number;
  paymentReceived: number;
  status: string;
  transactionCount: number;
  createdAt: string;
  isExternalClient: boolean;
  volumeUnit: string;
  transportId?: string | null;
  transportStatus?: string | null;
  transportRate?: number;
  shortageParty?: "TRANSPORTER" | "SUPPLIER" | "UNCONFIGURED";
  stationRetailCollected?: number | null;
  stationRetailRemaining?: number | null;
  stationCollectionPercent?: number | null;
};

type StatusTone = {
  label: string;
  text: string;
  dot: string;
  surface: string;
  border: string;
};

const DELIVERY_PAYMENT_STATUS: Record<string, StatusTone> = {
  CLEARED: {
    label: "Cleared",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    surface: "bg-emerald-50/80 dark:bg-emerald-950/30",
    border: "border-emerald-200/80 dark:border-emerald-800/60",
  },
  PART_PAID: {
    label: "Part paid",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
    surface: "bg-amber-50/80 dark:bg-amber-950/30",
    border: "border-amber-200/80 dark:border-amber-800/60",
  },
  UNPAID: {
    label: "Unpaid",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-600 dark:bg-rose-400",
    surface: "bg-rose-50/80 dark:bg-rose-950/30",
    border: "border-rose-200/80 dark:border-rose-800/60",
  },
  OVERDUE: {
    label: "Overdue",
    text: "text-rose-800 dark:text-rose-300",
    dot: "bg-rose-700 dark:bg-rose-300",
    surface: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-700/70",
  },
};

function formatDeliveryNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DeliveryPaymentStatusBadge({ status }: { status: string }) {
  const tone =
    DELIVERY_PAYMENT_STATUS[status] ?? {
      label: status.replace(/_/g, " ").toLowerCase(),
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
      surface: "bg-muted/40",
      border: "border-border",
    };

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-[22px] gap-1.5 rounded-md px-2 text-[11px] font-medium capitalize tracking-normal shadow-none",
        tone.text,
        tone.surface,
        tone.border
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      {tone.label}
    </Badge>
  );
}

function DeliveryRowActions({ row }: { row: SaleRow }) {
  const router = useRouter();

  const isTransportFinalized =
    row.transportStatus === "COMPLETED" || row.transportStatus === "CANCELLED";

  // Dialog open state
  const [openReceive, setOpenReceive] = useState(false);

  // Receive Dialog State
  const [litersReceived, setLitersReceived] = useState(row.litersReceived?.toString() || "");
  const [confirmShortage, setConfirmShortage] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const unit = row.volumeUnit || "L";
  const isAlreadyReceived = row.litersReceived !== null;
  const numReceived = litersReceived.trim() !== "" ? Number(litersReceived) : null;
  const hasReceivedInput = numReceived !== null && !isNaN(numReceived);
  const variance = hasReceivedInput ? row.litersDespatched - numReceived : null;
  const isSuccess = hasReceivedInput && variance === 0;
  const isShortage = hasReceivedInput && variance !== null && variance > 0;
  const remainingVolume = hasReceivedInput
    ? Math.max(0, variance ?? 0)
    : row.litersDespatched;

  const handleOpenReceive = () => {
    if (isTransportFinalized) {
      toast.error("Cannot edit delivery because the transport is finalized and marked as completed.");
      return;
    }
    setLitersReceived(row.litersReceived?.toString() || "");
    const hasVariance =
      row.litersReceived !== null && row.litersDespatched > row.litersReceived;
    setConfirmShortage(hasVariance && row.shortageDeducted);
    setReceiveError(null);
    setOpenReceive(true);
  };

  const handleReceive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransportFinalized) {
      setReceiveError("Cannot edit delivery because the transport is finalized and marked as completed.");
      return;
    }
    if (
      litersReceived.trim() === "" ||
      isNaN(Number(litersReceived)) ||
      Number(litersReceived) < 0
    ) {
      setReceiveError("Please enter a valid received volume (0 or greater).");
      return;
    }

    setIsReceiving(true);
    setReceiveError(null);

    const isShort = variance !== null && variance > 0;
    const finalShortageDeducted = isShort ? confirmShortage : true;

    if (isShort && finalShortageDeducted && row.shortageParty === "UNCONFIGURED") {
      setReceiveError(
        "Configure the supplier type (Local or Depot) before marking this delivery shortage as deductible."
      );
      return;
    }

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${row.id}`, {
      litersReceived: Number(litersReceived),
      litersReturned: 0,
      shortageDeducted: finalShortageDeducted,
    });

    setIsReceiving(false);

    if (res.error) {
      setReceiveError(res.error.message);
      toast.error(res.error.message);
    } else {
      toast.success(
        isAlreadyReceived
          ? "Delivery received volume updated successfully."
          : "Delivery confirmed and received successfully."
      );
      setOpenReceive(false);
      router.refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            title="Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          {row.isExternalClient && (
            <DropdownMenuItem
              onClick={handleOpenReceive}
              disabled={isTransportFinalized}
              className={isTransportFinalized ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isAlreadyReceived ? (
                <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
              ) : (
                <PackageCheck className="w-4 h-4 mr-2 text-emerald-600" />
              )}
              <span>{isAlreadyReceived ? "Edit Receipt" : "Receive Delivery"}</span>
              {isTransportFinalized && (
                <span className="ml-auto text-[10px] text-muted-foreground font-medium">Locked</span>
              )}
            </DropdownMenuItem>
          )}

          {row.isExternalClient && <DropdownMenuSeparator />}

          <DropdownMenuItem asChild>
            <Link href={`/admin/deliveries/${row.id}/waybill`}>
              <Printer className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>Print Waybill</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/admin/deliveries/${row.id}/print`}>
              <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>Print Invoice</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Receive / Edit Sales Delivery Dialog */}
      <Dialog
        open={openReceive && !isTransportFinalized}
        onOpenChange={(val) => {
          if (!isReceiving && !isTransportFinalized) setOpenReceive(val);
        }}
      >
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-lg lg:max-w-[540px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              {isAlreadyReceived ? "Update Delivery Receipt" : "Receive Sales Delivery"}
            </DialogTitle>
            <DialogDescription>
              Record confirmed volume delivered to external client{" "}
              <strong className="text-foreground">{row.customerName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Two inputs on the same row: Dispatched Volume & Remaining to be Received */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dispatched Volume
                </Label>
                <div className="relative">
                  <Input
                    readOnly
                    disabled
                    value={`${row.litersDespatched.toLocaleString()} ${unit}`}
                    className="h-9 bg-muted/50 cursor-not-allowed font-medium text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Remaining to Receive
                </Label>
                <div className="relative">
                  <Input
                    readOnly
                    disabled
                    value={`${remainingVolume.toLocaleString()} ${unit}`}
                    className={cn(
                      "h-9 cursor-not-allowed font-medium pr-8 text-xs",
                      isSuccess
                        ? "bg-emerald-50/60 text-emerald-950 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800"
                        : isShortage
                        ? "bg-amber-50/60 text-amber-950 border-amber-300 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800"
                        : "bg-muted/50 text-foreground"
                    )}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isShortage ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Received Volume input below */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`received-${row.id}`} className="text-xs font-semibold">
                  Received Volume ({unit})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => {
                    setLitersReceived(row.litersDespatched.toString());
                    if (receiveError) setReceiveError(null);
                  }}
                >
                  Match Dispatched ({row.litersDespatched.toLocaleString()} {unit})
                </Button>
              </div>

              <FormattedNumberInput
                id={`received-${row.id}`}
                min="0"
                placeholder={`e.g. ${row.litersDespatched}`}
                value={litersReceived}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setLitersReceived(e.target.value);
                  setConfirmShortage(false);
                  if (receiveError) setReceiveError(null);
                }}
                prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
              />
            </div>

            {/* Single alert if completed or variance shortage/overage */}
            {hasReceivedInput && (
              <>
                {isSuccess ? (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <AlertTitle className="text-xs font-semibold mb-0">
                      Delivery Fully Received (Zero Variance)
                    </AlertTitle>
                  </Alert>
                ) : isShortage ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <AlertTitle className="text-xs font-semibold mb-0">
                      Shortage of {variance!.toLocaleString()} {unit} Detected
                    </AlertTitle>
                  </Alert>
                ) : variance !== null && variance < 0 ? (
                  <Alert className="border-blue-200 bg-blue-50 text-blue-900 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <AlertTitle className="text-xs font-semibold mb-0">
                      Overage: +{Math.abs(variance).toLocaleString()} {unit} Received
                    </AlertTitle>
                  </Alert>
                ) : null}
              </>
            )}

            {isShortage && variance !== null && (
              <div className="space-y-3 pt-1">
                {!confirmShortage ? (
                  <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs text-blue-950 dark:text-blue-200">
                    <p className="font-medium text-blue-800 dark:text-blue-300">
                      {variance.toLocaleString()} {unit} remains pending (on truck / awaiting receipt). No
                      shortage charge until you confirm below.
                    </p>
                  </div>
                ) : null}

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id={`confirm-shortage-${row.id}`}
                    checked={confirmShortage}
                    onCheckedChange={(checked) => {
                      setConfirmShortage(checked === true);
                      if (receiveError) setReceiveError(null);
                    }}
                  />
                  <Label
                    htmlFor={`confirm-shortage-${row.id}`}
                    className="text-xs font-semibold leading-snug cursor-pointer"
                  >
                    Confirm deductible shortage ({variance.toLocaleString()} {unit})
                  </Label>
                </div>

                {confirmShortage ? (
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-950 dark:text-rose-200 space-y-2">
                    {row.shortageParty === "UNCONFIGURED" ? (
                      <p className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        Set the supplier type (Local or Depot) before charging this shortage.
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-2 font-medium">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            {row.shortageParty === "SUPPLIER"
                              ? "Supplier order credit:"
                              : "Transporter deduction:"}
                          </span>
                        </div>
                        {row.shortageParty === "TRANSPORTER" && (row.transportRate || 0) > 0 ? (
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                            -₦{((variance || 0) * (row.transportRate || 0)).toLocaleString()}
                          </span>
                        ) : row.shortageParty === "SUPPLIER" ? (
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                            {(variance || 0).toLocaleString()} {unit} credited
                          </span>
                        ) : (
                          <span className="font-medium text-muted-foreground text-xs">
                            ₦0 (No transport rate)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {receiveError && (
              <p className="text-xs font-medium text-destructive">{receiveError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpenReceive(false)}
              disabled={isReceiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReceive}
              disabled={isReceiving || litersReceived.trim() === ""}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isReceiving ? (
                <SpinnerEllipsis />
              ) : isAlreadyReceived ? (
                "Save Changes"
              ) : (
                "Confirm Receipt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const customerColumn: ColumnDef<SaleRow> = {
  accessorKey: "customerName",
  header: () => <span className="text-xs font-medium text-muted-foreground">Customer</span>,
    cell: ({ row }) => {
      const name = row.original.customerName;
      const details = row.original.transportDetails;
      return (
        <div className="flex items-center gap-2.5 py-0.5 min-w-0 max-w-[220px] sm:max-w-[280px]">
          <div className="size-9 flex items-center justify-center shrink-0 rounded-lg border border-primary/15 bg-primary/5 text-primary">
            <HugeiconsIcon icon={BadgePercentIcon} size={18} strokeWidth={2} />
          </div>
          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
            <span className="text-[13px] font-medium text-foreground truncate leading-tight" title={name}>
              {name}
            </span>
            <span className="text-[11px] text-muted-foreground truncate leading-snug" title={details}>
              {details}
            </span>
          </div>
        </div>
      );
    },
};

const stationColumn: ColumnDef<SaleRow> = {
  accessorKey: "customerName",
  header: () => <span className="text-xs font-medium text-muted-foreground">Station</span>,
  cell: ({ row }) => {
    const name = row.original.customerName;
    const details = row.original.transportDetails;
    return (
      <div className="flex items-center gap-2.5 py-0.5 min-w-0 max-w-[220px] sm:max-w-[280px]">
        <div className="size-9 flex items-center justify-center shrink-0 rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400">
          <Building2 className="size-4" strokeWidth={2} />
        </div>
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <span className="text-[13px] font-medium text-foreground truncate leading-tight" title={name}>
            {name}
          </span>
          <span className="text-[11px] text-muted-foreground truncate leading-snug" title={details}>
            {details}
          </span>
        </div>
      </div>
    );
  },
};

const receivedColumn: ColumnDef<SaleRow> = {
  accessorKey: "litersReceived",
  header: () => <span className="text-xs font-medium text-muted-foreground">Received</span>,
    cell: ({ row }) => {
      const vol = row.original.litersReceived;
      const unit = row.original.volumeUnit || "L";
      if (vol == null) {
        return (
          <Badge
            variant="outline"
            className="h-[22px] gap-1.5 rounded-md border-border/80 bg-muted/30 px-2 text-[11px] font-medium text-muted-foreground shadow-none"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/70" aria-hidden />
            Pending
          </Badge>
        );
      }
      return (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {vol.toLocaleString()}
          <span className="ml-0.5 text-[10px] font-sans text-muted-foreground">{unit}</span>
        </span>
      );
    },
};

const dispatchedColumn: ColumnDef<SaleRow> = {
  accessorKey: "litersDespatched",
  header: () => <span className="text-xs font-medium text-muted-foreground">Dispatched</span>,
  cell: ({ row }) => {
    const unit = row.original.volumeUnit || "L";
    return (
      <span className="font-mono text-xs tabular-nums text-foreground">
        {row.original.litersDespatched.toLocaleString()}
        <span className="ml-0.5 text-[10px] font-sans text-muted-foreground">{unit}</span>
      </span>
    );
  },
};

const varianceColumn: ColumnDef<SaleRow> = {
  accessorKey: "variance",
    header: () => <span className="text-xs font-medium text-muted-foreground">Variance</span>,
    cell: ({ row }) => {
      const variance = row.original.variance;
      const unit = row.original.volumeUnit || "L";
      if (variance === null) {
        return <span className="text-xs text-muted-foreground/60">—</span>;
      }
      const isShortage = variance > 0;
      const isBalanced = variance === 0;
      const display = isShortage
        ? `−${variance.toLocaleString()}`
        : variance < 0
          ? `+${Math.abs(variance).toLocaleString()}`
          : "0";

      if (isBalanced) {
        return (
          <Badge
            variant="outline"
            className="h-[22px] gap-1.5 rounded-md border-emerald-200/80 bg-emerald-50/60 px-2 text-[11px] font-medium text-emerald-700 shadow-none dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-400"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
            Balanced
          </Badge>
        );
      }

      return (
        <span
          className={cn(
            "font-mono text-xs tabular-nums font-medium",
            isShortage ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"
          )}
        >
          {display}
          <span className="ml-0.5 text-[10px] font-sans font-normal text-muted-foreground">{unit}</span>
        </span>
      );
    },
};

const rateColumn: ColumnDef<SaleRow> = {
  accessorKey: "amountPerLiter",
    header: () => <span className="text-xs font-medium text-muted-foreground">Rate</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatDeliveryNaira(row.original.amountPerLiter)}
        <span className="text-[10px] font-sans">/L</span>
      </span>
    ),
};

const expectedColumn: ColumnDef<SaleRow> = {
  accessorKey: "totalExpectedAmount",
  header: () => <span className="text-xs font-medium text-muted-foreground">Fleet sale</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums font-medium text-foreground">
        {formatDeliveryNaira(row.original.totalExpectedAmount)}
      </span>
    ),
};

const fleetExpectedB2bColumn: ColumnDef<SaleRow> = {
  ...expectedColumn,
  header: () => <span className="text-xs font-medium text-muted-foreground">Expected</span>,
};

const stationCollectionColumn: ColumnDef<SaleRow> = {
  id: "stationCollection",
  header: () => (
    <span className="text-xs font-medium text-muted-foreground">Retail coverage</span>
  ),
  cell: ({ row }) => {
    const collected = row.original.stationRetailCollected;
    const remaining = row.original.stationRetailRemaining;
    const percent = row.original.stationCollectionPercent;
    const fleetAmount = row.original.totalExpectedAmount;
    if (
      collected == null ||
      remaining == null ||
      percent == null ||
      fleetAmount <= 0
    ) {
      return <span className="text-xs text-muted-foreground/60">—</span>;
    }
    return (
      <DeliveryCollectionProgressRing
        collected={collected}
        remaining={remaining}
        percent={percent}
        fleetAmount={fleetAmount}
      />
    );
  },
};

const paymentReceivedColumn: ColumnDef<SaleRow> = {
  accessorKey: "paymentReceived",
  header: () => <span className="text-xs font-medium text-muted-foreground">Collected</span>,
    cell: ({ row }) => {
      const paid = row.original.paymentReceived;
      const expected = row.original.totalExpectedAmount;
      const isFullyPaid = expected > 0 && paid >= expected;
      return (
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            isFullyPaid
              ? "font-medium text-emerald-600 dark:text-emerald-400"
              : paid > 0
                ? "font-medium text-foreground"
                : "text-muted-foreground"
          )}
        >
          {formatDeliveryNaira(paid)}
        </span>
      );
    },
};

const statusColumn: ColumnDef<SaleRow> = {
  accessorKey: "status",
  header: () => <span className="text-xs font-medium text-muted-foreground">Payment</span>,
  cell: ({ row }) => <DeliveryPaymentStatusBadge status={row.original.status} />,
};

const dateColumn: ColumnDef<SaleRow> = {
  accessorKey: "createdAt",
  header: () => <span className="text-xs font-medium text-muted-foreground">Date</span>,
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground tabular-nums">
            {format(date, "MMM d, yyyy")}
          </span>
          <span suppressHydrationWarning className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    },
};

const actionsColumn: ColumnDef<SaleRow> = {
  id: "actions",
    header: () => <span className="text-right block pr-2">Actions</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <DeliveryRowActions row={row.original} />
      </div>
    ),
};

const b2bColumns: ColumnDef<SaleRow>[] = [
  customerColumn,
  receivedColumn,
  varianceColumn,
  rateColumn,
  fleetExpectedB2bColumn,
  paymentReceivedColumn,
  statusColumn,
  dateColumn,
  actionsColumn,
];

const stationColumns: ColumnDef<SaleRow>[] = [
  stationColumn,
  dispatchedColumn,
  receivedColumn,
  expectedColumn,
  stationCollectionColumn,
  statusColumn,
  dateColumn,
  actionsColumn,
];

type DeliveriesTabCounts = { stations: number; b2b: number };

function DeliveriesViewTabs({
  view,
  counts,
}: {
  view: DeliveriesListView;
  counts: DeliveriesTabCounts;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (next: DeliveriesListView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const tabs: {
    id: DeliveriesListView;
    label: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: "stations",
      label: "Managed stations",
      count: counts.stations,
      icon: <Building2 className="size-4 shrink-0" />,
    },
    {
      id: "b2b",
      label: "B2B client",
      count: counts.b2b,
      icon: <List className="size-4 shrink-0" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/80 px-1">
      {tabs.map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-t-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count.toLocaleString()}
            </span>
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SalesTable({
  data,
  view = "stations",
  tabCounts,
  filterNode,
  filterConfigs,
  serverPagination,
}: {
  data: SaleRow[];
  view?: DeliveriesListView;
  tabCounts?: DeliveriesTabCounts;
  filterNode?: React.ReactNode;
  filterConfigs?: FilterConfig[];
  serverPagination?: Omit<
    NonNullable<DataTableProps<SaleRow, unknown>["serverPagination"]>,
    "onPageChange" | "onPageSizeChange"
  >;
}) {
  const resolvedFilterNode =
    filterNode ??
    (filterConfigs && filterConfigs.length > 0 ? (
      <DataTableFilterDrawer filters={filterConfigs} triggerVariant="default" />
    ) : undefined);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("take", newSize.toString());
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const columns = view === "b2b" ? b2bColumns : stationColumns;
  const searchPlaceholder =
    view === "b2b" ? "Filter B2B deliveries…" : "Filter managed station deliveries…";

  return (
    <div className="space-y-0 rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
      {tabCounts ? <DeliveriesViewTabs view={view} counts={tabCounts} /> : null}
      <div className="px-4 pt-3 pb-1">
        <DataTable
          columns={columns}
          data={data}
          rowHref={(s) => `/admin/deliveries/${s.id}`}
          filterColumnId="customerName"
          searchPlaceholder={searchPlaceholder}
          filterNode={resolvedFilterNode}
          toolbarSearchFirst
      {...(serverPagination ? {
        serverPagination: {
          ...serverPagination,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      } : {})}
        />
      </div>
    </div>
  );
}
