"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { BadgeDollarSign, Droplet, PackageCheck, Pencil, Printer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

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
  variance: number | null;
  amountPerLiter: number;
  totalExpectedAmount: number;
  paymentReceived: number;
  status: string;
  transactionCount: number;
  createdAt: string;
  isExternalClient: boolean;
  volumeUnit: string;
};

function ReceiveDeliveryAction({ row }: { row: SaleRow }) {
  const [open, setOpen] = useState(false);
  const [litersReceived, setLitersReceived] = useState(row.litersReceived?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAlreadyReceived = row.litersReceived !== null;
  const numReceived = litersReceived.trim() !== "" ? Number(litersReceived) : null;
  const variance =
    numReceived !== null && !isNaN(numReceived)
      ? row.litersDespatched - numReceived
      : null;
  const unit = row.volumeUnit || "L";

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLitersReceived(row.litersReceived?.toString() || "");
    setError(null);
    setOpen(true);
  };

  const handleReceive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      litersReceived.trim() === "" ||
      isNaN(Number(litersReceived)) ||
      Number(litersReceived) < 0
    ) {
      setError("Please enter a valid received volume (0 or greater).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await apiPatch(`/api/tenant/fleet/deliveries/${row.id}`, {
      litersReceived: Number(litersReceived),
    });

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
      toast.error(res.error.message);
    } else {
      toast.success(
        isAlreadyReceived
          ? "Delivery received volume updated successfully."
          : "Delivery confirmed and received successfully."
      );
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      {isAlreadyReceived ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={handleOpen}
          title="Update Received Volume"
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          <span>Edit Receipt</span>
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          className="h-8 px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          onClick={handleOpen}
          title="Receive Sales Delivery"
        >
          <PackageCheck className="w-3.5 h-3.5 mr-1" />
          <span>Receive</span>
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!isSubmitting) setOpen(val);
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
                    if (error) setError(null);
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
                  if (error) setError(null);
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
                  "p-3 rounded-lg border text-xs space-y-1.5 transition-colors",
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
                <div className="flex items-center justify-between text-[11px] opacity-90 border-t border-current/10 pt-1">
                  <span>Effective Expected Revenue:</span>
                  <span className="font-mono font-medium">
                    ₦{(numReceived * row.amountPerLiter).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReceive}
              disabled={isSubmitting || litersReceived.trim() === ""}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
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
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {sale.isExternalClient && (
            <ReceiveDeliveryAction row={sale} />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            asChild
            title="Print Waybill"
          >
            <Link href={`/admin/deliveries/${sale.id}/print`}>
              <Printer className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      );
    }
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
