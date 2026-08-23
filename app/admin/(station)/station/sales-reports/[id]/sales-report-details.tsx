"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  User,
  Droplets,
  CircleDollarSign,
  Wallet,
  Scale,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DataTable, DataTableColumnHeader } from "@/components/tables";
import { FileViewerModal } from "@/components/file-viewer-modal";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { apiPatch } from "@/lib/client/api";
import { cn, formatHumanReadableDate } from "@/lib/utils";

interface SalesReportUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

interface PaymentEntry {
  id: string;
  amountPos: number;
  amountTransfer: number;
  status: ReviewStatus;
  logDate: string | Date;
  posReceiptUrl?: string | null;
  transferReceiptUrl?: string | null;
  recordedBy?: SalesReportUser | null;
  approvedBy?: SalesReportUser | null;
  reason?: string | null;
  posBankAccount?: BankAccount | null;
  transferBankAccount?: BankAccount | null;
  litersSold?: number;
  pricePerLiter?: number;
}

interface SalesReportRow extends PaymentEntry {
  tenantId: string;
  stationId: string;
  productType: string;
  litersSold: number;
  pricePerLiter: number;
  isDebtRepayment?: boolean;
  parentSaleId?: string | null;
  station: { id: string; name: string; code: string };
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
  parentSale?: (PaymentEntry & {
    productType: string;
    litersSold: number;
    pricePerLiter: number;
    debtRepayments: PaymentEntry[];
  }) | null;
  debtRepayments?: PaymentEntry[];
}

type PaymentLine = {
  id: string;
  sourceId: string;
  logDate: string;
  sourceType: "INITIAL_SALE" | "DEBT_REPAYMENT";
  method: "POS" | "TRANSFER";
  amount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  receiptUrl: string | null;
  status: ReviewStatus;
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
  reason: string | null;
  isCurrent: boolean;
};

const statusVariant: Record<ReviewStatus, "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function userName(user?: SalesReportUser | null) {
  if (!user) return "Unknown";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function buildPaymentLines(
  entry: PaymentEntry,
  sourceType: PaymentLine["sourceType"],
  currentId: string
): PaymentLine[] {
  const lines: PaymentLine[] = [];
  const pos = Number(entry.amountPos);
  const transfer = Number(entry.amountTransfer);

  if (pos > 0) {
    lines.push({
      id: `${entry.id}-pos`,
      sourceId: entry.id,
      logDate: String(entry.logDate),
      sourceType,
      method: "POS",
      amount: pos,
      bankName: entry.posBankAccount?.bankName ?? "—",
      accountName: entry.posBankAccount?.accountName ?? "—",
      accountNumber: entry.posBankAccount?.accountNumber ?? "—",
      receiptUrl: entry.posReceiptUrl ?? null,
      status: entry.status,
      recordedBy: entry.recordedBy ?? null,
      approvedBy: entry.approvedBy ?? null,
      reason: entry.reason ?? null,
      isCurrent: entry.id === currentId,
    });
  }

  if (transfer > 0) {
    lines.push({
      id: `${entry.id}-transfer`,
      sourceId: entry.id,
      logDate: String(entry.logDate),
      sourceType,
      method: "TRANSFER",
      amount: transfer,
      bankName: entry.transferBankAccount?.bankName ?? "—",
      accountName: entry.transferBankAccount?.accountName ?? "—",
      accountNumber: entry.transferBankAccount?.accountNumber ?? "—",
      receiptUrl: entry.transferReceiptUrl ?? null,
      status: entry.status,
      recordedBy: entry.recordedBy ?? null,
      approvedBy: entry.approvedBy ?? null,
      reason: entry.reason ?? null,
      isCurrent: entry.id === currentId,
    });
  }

  return lines;
}

export function SalesReportDetails({ report }: { report: SalesReportRow }) {
  const router = useRouter();

  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [reviewTargetId, setReviewTargetId] = React.useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = React.useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const [activeFileUrl, setActiveFileUrl] = React.useState<string | null>(null);
  const [activeFileName, setActiveFileName] = React.useState<string | undefined>();
  const [isFileViewerOpen, setIsFileViewerOpen] = React.useState(false);
  const [detailsRow, setDetailsRow] = React.useState<PaymentLine | null>(null);

  const flowParent = report.isDebtRepayment && report.parentSale ? report.parentSale : report;
  const flowChildren = React.useMemo(() => {
    const children = [...(flowParent.debtRepayments || [])];
    children.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    return children;
  }, [flowParent]);

  const paymentLines = React.useMemo<PaymentLine[]>(() => {
    return [
      ...buildPaymentLines(flowParent, "INITIAL_SALE", report.id),
      ...flowChildren.flatMap((child) => buildPaymentLines(child, "DEBT_REPAYMENT", report.id)),
    ];
  }, [flowParent, flowChildren, report.id]);

  const metrics = React.useMemo(() => {
    const expected = Number(flowParent.litersSold) * Number(flowParent.pricePerLiter);
    const parentReceived = Number(flowParent.amountPos) + Number(flowParent.amountTransfer);
    const approvedRepayments = flowChildren
      .filter((child) => child.status === "APPROVED")
      .reduce((sum, child) => sum + Number(child.amountPos) + Number(child.amountTransfer), 0);
    const pos = paymentLines.filter((line) => line.method === "POS").reduce((sum, line) => sum + line.amount, 0);
    const transfer = paymentLines
      .filter((line) => line.method === "TRANSFER")
      .reduce((sum, line) => sum + line.amount, 0);
    const received = parentReceived + approvedRepayments;
    const outstanding = expected - received;

    return {
      expected,
      pos,
      transfer,
      received,
      outstanding,
      litersSold: Number(flowParent.litersSold),
      pricePerLiter: Number(flowParent.pricePerLiter),
      repayments: flowChildren.length,
      pendingApprovals: [flowParent, ...flowChildren].filter((entry) => entry.status === "PENDING").length,
    };
  }, [flowParent, flowChildren, paymentLines]);

  const handleOpenReceipt = (url: string, name: string) => {
    setActiveFileUrl(url);
    setActiveFileName(name);
    setIsFileViewerOpen(true);
  };

  const handleOpenReviewModal = (targetId: string, initialStatus: string) => {
    setReviewTargetId(targetId);
    setReviewStatus(initialStatus === "REJECTED" ? "REJECTED" : "APPROVED");
    setReason("");
    setApiError(null);
    setReviewModalOpen(true);
  };

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTargetId) return;

    if (reviewStatus === "REJECTED" && !reason.trim()) {
      setApiError("Rejection reason is required.");
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    const res = await apiPatch(`/api/tenant/stations/${report.stationId}/sales-logs/${reviewTargetId}`, {
      status: reviewStatus,
      reason: reason.trim() || null,
    });

    setIsSubmitting(false);

    if (res.error) {
      setApiError(res.error.message);
    } else {
      setReviewModalOpen(false);
      router.refresh();
    }
  };

  const columns = React.useMemo<ColumnDef<PaymentLine>[]>(
    () => [
      {
        accessorKey: "logDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.logDate), "LLL dd, y")}
          </span>
        ),
      },
      {
        accessorKey: "sourceType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
        meta: { label: "Source" },
        cell: ({ row }) => (
          <span>{row.original.sourceType === "INITIAL_SALE" ? "Initial sale" : "Debt repayment"}</span>
        ),
      },
      {
        accessorKey: "method",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
        meta: { label: "Method" },
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.method === "POS" ? "POS" : "Transfer"}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount sent" />,
        meta: { label: "Amount sent" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">{fmtMoney(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "bankName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bank" />,
        meta: { label: "Bank" },
        cell: ({ row }) => <span>{row.original.bankName}</span>,
      },
      {
        accessorKey: "accountNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
        meta: { label: "Account" },
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.original.accountNumber}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
        ),
      },
      {
        id: "receipt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Receipt" />,
        meta: { label: "Receipt" },
        cell: ({ row }) =>
          row.original.receiptUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() =>
                handleOpenReceipt(
                  row.original.receiptUrl!,
                  row.original.method === "POS" ? "POS Receipt" : "Transfer Receipt"
                )
              }
            >
              <ImageIcon className="mr-1.5 size-3.5" />
              View
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
        meta: { label: "Action" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenReviewModal(row.original.sourceId, row.original.status)}
            >
              Review
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDetailsRow(row.original)}>
              Details
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const isDebt = metrics.outstanding > 0;
  const isOverpaid = metrics.outstanding < 0;
  const receivedLabel = metrics.pendingApprovals > 0 ? "Received amount" : "Reconciled amount";
  const balanceTitle = isDebt ? "Debt" : "Balance";
  const balanceValue = metrics.outstanding === 0 ? "Settled" : fmtMoney(Math.abs(metrics.outstanding));
  const settlementHint =
    metrics.outstanding === 0
      ? "Fully settled"
      : isDebt
        ? "Still outstanding"
        : "Overpaid";

  const settlementCards = [
    {
      title: "Litres sold",
      value: `${metrics.litersSold.toLocaleString()} L`,
      hint: `@ ${fmtMoney(metrics.pricePerLiter)} / L`,
      icon: Droplets,
      valueColor: "",
      iconColor: "text-sky-600",
    },
    {
      title: "Expected amount",
      value: fmtMoney(metrics.expected),
      hint: `${metrics.litersSold.toLocaleString()} L × ${fmtMoney(metrics.pricePerLiter)}`,
      icon: CircleDollarSign,
      valueColor: "",
      iconColor: "text-indigo-600",
    },
    {
      title: receivedLabel,
      value: fmtMoney(metrics.received),
      hint:
        metrics.repayments > 0
          ? `POS ${fmtMoney(metrics.pos)} · Transfer ${fmtMoney(metrics.transfer)} · ${metrics.repayments} repayment${metrics.repayments === 1 ? "" : "s"}`
          : `POS ${fmtMoney(metrics.pos)} · Transfer ${fmtMoney(metrics.transfer)}`,
      icon: Wallet,
      valueColor: "text-emerald-600",
      iconColor: "text-emerald-600",
    },
    {
      title: balanceTitle,
      value: balanceValue,
      hint: `${settlementHint}${metrics.pendingApprovals > 0 ? ` · ${metrics.pendingApprovals} pending` : ""}`,
      icon: Scale,
      valueColor: isDebt ? "text-rose-600" : isOverpaid ? "text-amber-600" : "text-emerald-600",
      iconColor: isDebt ? "text-rose-600" : isOverpaid ? "text-amber-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild className="mt-0.5 h-9 w-9 shrink-0">
          <Link href="/admin/station/sales-reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">Sales Report Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.station.name} ({report.station.code}) · {report.productType} ·{" "}
            {metrics.litersSold.toLocaleString()} L @ {fmtMoney(metrics.pricePerLiter)}/L ·{" "}
            {formatHumanReadableDate(report.logDate)}
            {report.isDebtRepayment ? " · Debt repayment" : ""}
          </p>
        </div>
        {report.status === "APPROVED" ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="mr-1.5 size-4" /> Approved
          </Badge>
        ) : report.status === "REJECTED" ? (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10">
            <AlertCircle className="mr-1.5 size-4" /> Rejected
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10">
            Pending Review
          </Badge>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Amounts sent</h2>
        <DataTable
          columns={columns}
          data={paymentLines}
          tableId="station-sales-report-payments"
          emptyMessage="No POS or transfer amounts were sent for this sale."
          hideToolbar
          hidePagination
          pageSize={50}
          getRowClassName={(row) => (row.isCurrent ? "bg-primary/5" : undefined)}
        />

        <div className="border-x border-b border-border bg-muted/40">
          <p className="px-4 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Settlement details
          </p>
          <div className="flex w-full flex-wrap items-stretch">
            {settlementCards.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  "w-full border-border sm:w-1/2 lg:w-1/4",
                  index < settlementCards.length - 1 && "border-b",
                  index >= 2 && "sm:border-b-0",
                  "lg:border-b-0",
                  index % 2 === 0 && "sm:border-e",
                  index < settlementCards.length - 1 && "lg:border-e"
                )}
              >
                <div className="flex h-full items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {item.title}
                    </p>
                    <p className={cn("font-mono text-sm font-semibold text-card-foreground", item.valueColor)}>
                      {item.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <div className="rounded-full bg-background p-2.5 outline outline-1 outline-border/50">
                    <item.icon size={14} className={item.iconColor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={!!detailsRow} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <SheetContent side="right" className="flex w-[400px] flex-col sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Entry details</SheetTitle>
            <SheetDescription>Timeline and logging details for this remittance.</SheetDescription>
          </SheetHeader>
          {detailsRow && (
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
              <div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
                <div>
                  <span className="block text-xs text-muted-foreground">Method</span>
                  <span>{detailsRow.method === "POS" ? "POS" : "Transfer"}</span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Amount sent</span>
                  <span className="font-mono font-semibold">{fmtMoney(detailsRow.amount)}</span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Bank</span>
                  <span>{detailsRow.bankName}</span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Account</span>
                  <span className="font-mono">{detailsRow.accountNumber}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{detailsRow.accountName}</span>
                </div>
              </div>

              <div className="relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-border/60">
                <div className="relative">
                  <div className="absolute top-1 -left-5 size-3 rounded-full border-2 border-background bg-primary" />
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <span className="mb-1 block text-sm font-semibold">Sales log submitted</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      <span>
                        By <strong className="text-foreground">{userName(detailsRow.recordedBy)}</strong>
                        {detailsRow.recordedBy?.email ? ` (${detailsRow.recordedBy.email})` : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {format(new Date(detailsRow.logDate), "LLL dd, y")}
                    </p>
                  </div>
                </div>

                {detailsRow.status !== "PENDING" && (
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute top-1 -left-5 size-3 rounded-full border-2 border-background",
                        detailsRow.status === "APPROVED" ? "bg-emerald-600" : "bg-rose-600"
                      )}
                    />
                    <div
                      className={cn(
                        "rounded-xl border bg-card p-4 shadow-sm",
                        detailsRow.status === "APPROVED"
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-rose-500/20 bg-rose-500/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mb-1 block text-sm font-semibold",
                          detailsRow.status === "APPROVED" ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {detailsRow.status === "APPROVED" ? "Report approved" : "Report rejected"}
                      </span>
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="size-3.5" />
                        <span>
                          By <strong className="text-foreground">{userName(detailsRow.approvedBy)}</strong>
                          {detailsRow.approvedBy?.email ? ` (${detailsRow.approvedBy.email})` : ""}
                        </span>
                      </div>
                      {detailsRow.reason && (
                        <div className="whitespace-pre-wrap rounded-lg border bg-background/60 p-3 text-sm italic text-muted-foreground">
                          {detailsRow.reason}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <FileViewerModal
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        fileUrl={activeFileUrl}
        fileName={activeFileName}
      />

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Decision</DialogTitle>
            <DialogDescription>
              Review the report details and provide an approval decision.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewReport} className="space-y-5 py-4">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Action</Label>
              <Select value={reviewStatus} onValueChange={(val) => setReviewStatus(val as "APPROVED" | "REJECTED")}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve Report</SelectItem>
                  <SelectItem value="REJECTED">Reject Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label
                htmlFor="review-reason"
                className={cn("text-sm font-semibold", reviewStatus === "REJECTED" && "text-rose-600")}
              >
                Remarks {reviewStatus === "REJECTED" && "*"}
              </Label>
              <Textarea
                id="review-reason"
                placeholder={
                  reviewStatus === "REJECTED"
                    ? "Specify why the report is rejected..."
                    : "Add any notes or remarks..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {apiError && <p className="text-sm font-medium text-rose-600">{apiError}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn("h-11 w-full gap-2", reviewStatus === "REJECTED" && "bg-rose-600 text-white hover:bg-rose-700")}
            >
              {isSubmitting ? (
                <>
                  <SpinnerEllipsis />
                  <span>Saving...</span>
                </>
              ) : reviewStatus === "APPROVED" ? (
                "Save & Approve"
              ) : (
                "Save & Reject"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
