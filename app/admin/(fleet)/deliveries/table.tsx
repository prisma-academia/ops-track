"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { BadgeDollarSign, Droplet, FileText, MoreHorizontal, PackageCheck, Pencil, Printer, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
};

function DeliveryRowActions({ row }: { row: SaleRow }) {
  const router = useRouter();

  // Dialog open states
  const [openReceive, setOpenReceive] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);

  // Receive Dialog State
  const [litersReceived, setLitersReceived] = useState(row.litersReceived?.toString() || "");
  const [shortageDeducted, setShortageDeducted] = useState(row.shortageDeducted ?? true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Return to Truck Dialog State
  const [returnAmount, setReturnAmount] = useState(
    row.litersReturned ? Number(row.litersReturned).toString() : ""
  );
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const unit = row.volumeUnit || "L";
  const isAlreadyReceived = row.litersReceived !== null;
  const numReceived = litersReceived.trim() !== "" ? Number(litersReceived) : null;
  const variance =
    numReceived !== null && !isNaN(numReceived)
      ? row.litersDespatched - numReceived
      : null;

  const actualReceived = row.litersReceived !== null ? row.litersReceived : 0;
  const currentReturned = Number(row.litersReturned || 0);
  const unreceived = Math.max(0, row.litersDespatched - actualReceived);
  const canReturn =
    row.litersReceived !== null &&
    (unreceived > 0 || currentReturned > 0) &&
    row.transportStatus !== "COMPLETED" &&
    row.transportStatus !== "CANCELLED";

  const handleOpenReceive = () => {
    setLitersReceived(row.litersReceived?.toString() || "");
    setShortageDeducted(row.shortageDeducted ?? true);
    setReceiveError(null);
    setOpenReceive(true);
  };

  const handleReceive = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${row.id}`, {
      litersReceived: Number(litersReceived),
      shortageDeducted,
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

  const handleOpenReturn = () => {
    setReturnAmount(currentReturned > 0 ? currentReturned.toString() : unreceived.toString());
    setReturnError(null);
    setOpenReturn(true);
  };

  const handleReturn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const qty = Number(returnAmount);
    if (isNaN(qty) || qty < 0) {
      setReturnError("Please enter a valid volume (0 or greater).");
      return;
    }
    if (qty + actualReceived > row.litersDespatched + 0.001) {
      setReturnError(
        `Returned volume (${qty.toLocaleString()} ${unit}) + received (${actualReceived.toLocaleString()} ${unit}) cannot exceed dispatched (${row.litersDespatched.toLocaleString()} ${unit}).`
      );
      return;
    }

    setIsReturning(true);
    setReturnError(null);

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${row.id}`, {
      litersReturned: qty,
    });

    setIsReturning(false);

    if (res.error) {
      setReturnError(res.error.message);
      toast.error(res.error.message);
    } else {
      toast.success(
        qty > 0
          ? `${qty.toLocaleString()} ${unit} returned to truck. Available for reassignment.`
          : "Returned volume updated."
      );
      setOpenReturn(false);
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
        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
          {row.isExternalClient && (
            <DropdownMenuItem onClick={handleOpenReceive}>
              {isAlreadyReceived ? (
                <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
              ) : (
                <PackageCheck className="w-4 h-4 mr-2 text-emerald-600" />
              )}
              <span>{isAlreadyReceived ? "Edit Receipt" : "Receive Delivery"}</span>
            </DropdownMenuItem>
          )}

          {canReturn && (
            <DropdownMenuItem onClick={handleOpenReturn}>
              <RotateCcw className="w-4 h-4 mr-2 text-blue-600" />
              <span>{currentReturned > 0 ? "Edit Return to Truck" : "Return to Truck"}</span>
            </DropdownMenuItem>
          )}

          {(row.isExternalClient || canReturn) && <DropdownMenuSeparator />}

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

      {/* Receive Sales Delivery Dialog */}
      <Dialog
        open={openReceive}
        onOpenChange={(val) => {
          if (!isReceiving) setOpenReceive(val);
        }}
      >
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-md"
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
            {/* Info Summary */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30 text-xs">
              <div>
                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                  Dispatched
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {row.litersDespatched.toLocaleString()} {unit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                  Unit Price
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  ₦{row.amountPerLiter.toLocaleString()} / {unit}
                </p>
              </div>
              <div className="col-span-2 pt-1.5 border-t border-border/50 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Transport / Truck:</span>
                <span className="font-medium text-foreground text-[11px] truncate max-w-[240px]">
                  {row.transportDetails}
                </span>
              </div>
            </div>

            {/* Input field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`received-${row.id}`} className="text-sm font-medium">
                  Volume Received ({unit})
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
              <p className="text-[11px] text-muted-foreground">
                Enter the verified physical quantity received at the client destination.
              </p>
            </div>

            {/* Live Calculation preview */}
            {variance !== null && numReceived !== null && (
              <div
                className={cn(
                  "p-3 rounded-lg border text-xs space-y-2 transition-colors",
                  variance === 0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : variance > 0
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300"
                )}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Variance:</span>
                  <span>
                    {variance === 0
                      ? `0 ${unit} (Exact match)`
                      : variance > 0
                      ? `-${variance.toLocaleString()} ${unit} (Shortage)`
                      : `+${Math.abs(variance).toLocaleString()} ${unit} (Overage)`}
                  </span>
                </div>
                {variance > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-medium border-t border-current/10 pt-1.5 text-rose-700 dark:text-rose-400">
                    <span>Shortage Deduction:</span>
                    <span className="font-mono">
                      -₦{(variance * row.amountPerLiter).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] opacity-90 border-t border-current/10 pt-1">
                  <span>Effective Expected Revenue:</span>
                  <span className="font-mono font-medium">
                    ₦{(numReceived * row.amountPerLiter).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {variance !== null && variance > 0 && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-muted/40 text-xs">
                <Checkbox
                  id={`deduct-${row.id}`}
                  checked={shortageDeducted}
                  onCheckedChange={(val) => setShortageDeducted(!!val)}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5 leading-snug">
                  <Label htmlFor={`deduct-${row.id}`} className="text-xs font-semibold cursor-pointer">
                    Deduct shortage from driver / transporter fee
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    If checked, ₦{(variance * row.amountPerLiter).toLocaleString()} is deducted from the transporter's payout. Uncheck if this should not penalize the driver.
                  </span>
                </div>
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

      {/* Return to Truck Dialog */}
      <Dialog
        open={openReturn}
        onOpenChange={(val) => {
          if (!isReturning) setOpenReturn(val);
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Return Volume to Truck
            </DialogTitle>
            <DialogDescription>
              Assign unreceived volume from delivery to{" "}
              <strong className="text-foreground">{row.customerName}</strong> back to the truck tank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border bg-muted/30 text-xs">
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-semibold">Dispatched</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {row.litersDespatched.toLocaleString()} {unit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-semibold">Received</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {actualReceived.toLocaleString()} {unit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-semibold">Shortfall</p>
                <p className="text-sm font-semibold text-rose-600 mt-0.5">
                  {unreceived.toLocaleString()} {unit}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`return-${row.id}`} className="text-sm font-medium">
                  Volume to Return to Truck ({unit})
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
                  Max ({unreceived.toLocaleString()} {unit})
                </Button>
              </div>

              <FormattedNumberInput
                id={`return-${row.id}`}
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenReturn(false)} disabled={isReturning}>
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              disabled={isReturning || returnAmount.trim() === ""}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isReturning ? <SpinnerEllipsis /> : "Confirm Return to Truck"}
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
