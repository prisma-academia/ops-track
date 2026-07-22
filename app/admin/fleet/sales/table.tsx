"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { BadgeDollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiPost } from "@/lib/client/api";
import { useRouter, useSearchParams } from "next/navigation";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

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
};

function LogDeductionAction({ row }: { row: SaleRow }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const variance = row.variance ?? 0;
  if (variance <= 0) return null;

  const totalDeduction = variance * row.amountPerLiter;

  const handleDeduct = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    const res = await apiPost(`/api/tenant/fleet/sales/${row.id}/deduct-shortage`, {
      variance,
      pricePerLiter: row.amountPerLiter,
      totalDeduction,
    });
    setIsSubmitting(false);

    if (!res.error) {
      setOpen(false);
      router.refresh();
    } else {
      alert(res.error.message);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Log Deduction
      </Button>

      <Dialog open={open} onOpenChange={(val) => {
        if (!isSubmitting) setOpen(val);
      }}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Log Shortage Deduction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              A shortage of <strong>{variance.toLocaleString()} L</strong> was detected. 
              The driver&apos;s transport fee will be deducted by the value of the lost product.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Shortage</p>
                <p className="text-lg font-semibold">{variance.toLocaleString()} L</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Price / Liter</p>
                <p className="text-lg font-semibold">₦{row.amountPerLiter.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20 text-destructive">
              <p className="text-xs uppercase tracking-widest">Total Deduction</p>
              <p className="text-xl font-bold">₦{totalDeduction.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeduct} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Confirm Deduction"}
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
    header: "Vol. Received (L)",
    cell: ({ row }) => {
      const vol = row.original.litersReceived;
      return vol != null ? vol.toLocaleString() : "Pending";
    }
  },
  {
    accessorKey: "variance",
    header: "Variance (L)",
    cell: ({ row }) => {
      const variance = row.original.variance;
      if (variance === null) return "—";
      return (
        <span className={variance > 0 ? "text-destructive font-medium" : "text-emerald-600"}>
          {variance > 0 ? `-${variance.toLocaleString()}` : variance.toLocaleString()}
        </span>
      );
    }
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
    cell: ({ row }) => <LogDeductionAction row={row.original} />
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
      rowHref={(s) => `/admin/fleet/sales/${s.id}`}
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
