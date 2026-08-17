"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { CheckCircle2, ShieldQuestion, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentSummaryRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  confirming,
  title = "Confirm payment",
  description = "Please review the details below before logging this payment.",
  amountLabel,
  rows,
  confirmLabel = "Confirm & Log Payment",
  tone = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirming: boolean;
  title?: string;
  description?: string;
  amountLabel: string;
  rows: PaymentSummaryRow[];
  confirmLabel?: string;
  tone?: "default" | "destructive";
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              tone === "destructive" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
            )}
          >
            <ShieldQuestion />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="w-full rounded-lg border bg-muted/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-lg font-bold tabular-nums">{amountLabel}</span>
          </div>
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
              <span
                className={cn(
                  "text-xs text-right truncate",
                  row.emphasis ? "font-semibold text-foreground" : "font-medium"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel, review again</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={confirming}
            className="gap-2"
          >
            {confirming ? (
              <>
                <SpinnerEllipsis />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type PaymentResultStatus = "success" | "error";

export function PaymentResultDialog({
  open,
  onOpenChange,
  status,
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PaymentResultStatus;
  title: string;
  description?: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const isSuccess = status === "success";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              isSuccess ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
            )}
          >
            {isSuccess ? <CheckCircle2 /> : <XCircle />}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {secondaryLabel && onSecondaryAction ? (
            <AlertDialogCancel onClick={onSecondaryAction}>{secondaryLabel}</AlertDialogCancel>
          ) : null}
          <AlertDialogAction onClick={onPrimaryAction}>{primaryLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}