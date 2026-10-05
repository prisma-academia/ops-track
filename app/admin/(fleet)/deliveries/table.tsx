"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { BadgeDollarSign, Droplet, FileText, MoreHorizontal, PackageCheck, Pencil, Printer, Truck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
};

type ShortageReconciliationMode = "IN_TRUCK" | "SHORTAGE_DEDUCT";

function DeliveryRowActions({ row }: { row: SaleRow }) {
  const router = useRouter();

  const isTransportFinalized =
    row.transportStatus === "COMPLETED" || row.transportStatus === "CANCELLED";

  // Dialog open state
  const [openReceive, setOpenReceive] = useState(false);

  // Receive Dialog State
  const [litersReceived, setLitersReceived] = useState(row.litersReceived?.toString() || "");
  const [shortageMode, setShortageMode] = useState<ShortageReconciliationMode>(
    row.litersReturned > 0 ? "IN_TRUCK" : "SHORTAGE_DEDUCT"
  );
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
    const initialMode: ShortageReconciliationMode =
      row.litersReturned > 0 ? "IN_TRUCK" : "SHORTAGE_DEDUCT";
    setShortageMode(initialMode);
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
    const finalLitersReturned = isShort && shortageMode === "IN_TRUCK" ? variance : 0;
    const finalShortageDeducted = isShort ? shortageMode === "SHORTAGE_DEDUCT" : true;

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${row.id}`, {
      litersReceived: Number(litersReceived),
      litersReturned: finalLitersReturned,
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

            {/* If shortage, show reconciliation option (on truck vs mark as shortage) */}
            {isShortage && variance !== null && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor={`shortage-mode-${row.id}`} className="text-xs font-semibold">
                    Shortage Reconciliation
                  </Label>
                  <Select
                    value={shortageMode}
                    onValueChange={(val: "IN_TRUCK" | "SHORTAGE_DEDUCT") => setShortageMode(val)}
                  >
                    <SelectTrigger id={`shortage-mode-${row.id}`} className="w-full bg-card">
                      <SelectValue placeholder="Select reconciliation method" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="IN_TRUCK">
                        Remains in Truck Tank
                      </SelectItem>
                      <SelectItem value="SHORTAGE_DEDUCT">
                        Mark as Shortage
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {shortageMode === "SHORTAGE_DEDUCT" ? (
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs flex items-center justify-between text-rose-950 dark:text-rose-200">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Driver Transport Deduction:</span>
                    </div>
                    {(row.transportRate || 0) > 0 ? (
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                        -₦{((variance || 0) * (row.transportRate || 0)).toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-medium text-muted-foreground text-xs">
                        ₦0 (No driver transport fee)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs flex items-center justify-between text-blue-950 dark:text-blue-200">
                    <div className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-300">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Volume Remaining in Truck:</span>
                    </div>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">
                      {variance.toLocaleString()} {unit}
                    </span>
                  </div>
                )}
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

const columns: ColumnDef<SaleRow>[] = [
  { 
    accessorKey: "customerName", 
    header: "Customer",
    cell: ({ row }) => {
      const name = row.original.customerName;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{row.original.transportDetails}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "litersReceived", 
    header: "Vol. Received",
    cell: ({ row }) => {
      const vol = row.original.litersReceived;
      const unit = row.original.volumeUnit || "L";
      return vol != null ? (
        <span className="font-medium text-foreground">
          {vol.toLocaleString()} {unit}
        </span>
      ) : (
        <span className="text-muted-foreground italic">Pending</span>
      );
    }
  },
  {
    accessorKey: "variance",
    header: "Variance",
    cell: ({ row }) => {
      const variance = row.original.variance;
      const unit = row.original.volumeUnit || "L";
      if (variance === null) return "—";
      return (
        <span className={variance > 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
          {variance > 0 ? `-${variance.toLocaleString()} ${unit}` : `${variance.toLocaleString()} ${unit}`}
        </span>
      );
    }
  },
  {
    accessorKey: "amountPerLiter",
    header: "Sold Price (₦/L)",
    cell: ({ row }) => row.original.amountPerLiter.toLocaleString(),
  },
  { 
    accessorKey: "totalExpectedAmount", 
    header: "Expected Amt (₦)",
    cell: ({ row }) => row.original.totalExpectedAmount.toLocaleString()
  },
  { 
    accessorKey: "paymentReceived", 
    header: "Paid (₦)",
    cell: ({ row }) => row.original.paymentReceived.toLocaleString()
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === "UNPAID") variant = "destructive";
      if (status === "PART_PAID") variant = "secondary";
      if (status === "CLEARED") variant = "default";
      if (status === "OVERDUE") variant = "destructive";
      return (
        <Badge variant={variant}>
          {status}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "createdAt", 
    header: "Date",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    }
  },
  {
    id: "actions",
    header: () => <span className="text-right block pr-2">Actions</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <DeliveryRowActions row={row.original} />
      </div>
    ),
  }
];

export function SalesTable({ data, filterNode, serverPagination }: { data: SaleRow[], filterNode?: React.ReactNode, serverPagination?: any }) {
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

  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/deliveries/${s.id}`}
      filterColumnId="customerName"
      searchPlaceholder="Search by customer/station…"
      filterNode={filterNode}
      {...(serverPagination ? {
        serverPagination: {
          ...serverPagination,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      } : {})}
    />
  );
}
