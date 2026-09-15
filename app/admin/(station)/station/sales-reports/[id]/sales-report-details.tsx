"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Upload,
  Loader2,
  User,
  Droplets,
  CircleDollarSign,
  Wallet,
  Scale,
  Eye,
  Trash2,
  Maximize2,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

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
  DialogClose,
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
import { apiPatch, apiPost } from "@/lib/client/api";
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

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "PARTIAL";

interface PaymentReviewEvent {
  id: string;
  status: "APPROVED" | "REJECTED" | "PENDING" | "PARTIAL";
  reason?: string | null;
  reviewedAt: string | Date;
  reviewedBy?: SalesReportUser | null;
}

interface SalesPaymentRow {
  id: string;
  method: "POS" | "TRANSFER";
  amount: number;
  receiptUrl?: string | null;
  status: ReviewStatus;
  reason?: string | null;
  bankAccount?: BankAccount | null;
  reviews?: PaymentReviewEvent[];
}

interface PaymentEntry {
  id: string;
  amountPos: number;
  amountTransfer: number;
  appliedCredit?: number;
  status: ReviewStatus;
  logDate: string | Date;
  posReceiptUrl?: string | null;
  transferReceiptUrl?: string | null;
  recordedBy?: SalesReportUser | null;
  approvedBy?: SalesReportUser | null;
  reason?: string | null;
  posBankAccount?: BankAccount | null;
  transferBankAccount?: BankAccount | null;
  payments?: SalesPaymentRow[];
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
  paymentId: string;
  logDate: string;
  sourceType: "INITIAL_SALE" | "DEBT_REPAYMENT";
  method: "POS" | "TRANSFER";
  label: string;
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
  reviews: PaymentReviewEvent[];
};

const statusVariant: Record<ReviewStatus, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  PARTIAL: "outline",
};

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function userName(user?: SalesReportUser | null) {
  if (!user) return "Unknown";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function approvedReceived(entry: PaymentEntry) {
  if (entry.payments && entry.payments.length > 0) {
    return entry.payments
      .filter((p) => p.status === "APPROVED")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }
  return Number(entry.amountPos) + Number(entry.amountTransfer);
}

function buildPaymentLines(
  entry: PaymentEntry,
  sourceType: PaymentLine["sourceType"],
  currentId: string
): PaymentLine[] {
  if (entry.payments && entry.payments.length > 0) {
    return entry.payments.map((payment) => ({
      id: payment.id,
      sourceId: entry.id,
      paymentId: payment.id,
      logDate: String(entry.logDate),
      sourceType,
      method: payment.method,
      label: payment.method === "POS" ? "POS" : "Transfer",
      amount: Number(payment.amount),
      bankName: payment.bankAccount?.bankName ?? "—",
      accountName: payment.bankAccount?.accountName ?? "—",
      accountNumber: payment.bankAccount?.accountNumber ?? "—",
      receiptUrl: payment.receiptUrl ?? null,
      status: payment.status,
      recordedBy: entry.recordedBy ?? null,
      approvedBy: entry.approvedBy ?? null,
      reason: payment.reason ?? null,
      isCurrent: entry.id === currentId,
      reviews: payment.reviews ?? [],
    }));
  }

  const lines: PaymentLine[] = [];
  const pos = Number(entry.amountPos);
  const transfer = Number(entry.amountTransfer);

  if (pos > 0) {
    lines.push({
      id: `${entry.id}-pos`,
      sourceId: entry.id,
      paymentId: entry.id,
      logDate: String(entry.logDate),
      sourceType,
      method: "POS",
      label: "POS",
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
      reviews: [],
    });
  }

  if (transfer > 0) {
    lines.push({
      id: `${entry.id}-transfer`,
      sourceId: entry.id,
      paymentId: entry.id,
      logDate: String(entry.logDate),
      sourceType,
      method: "TRANSFER",
      label: "Transfer",
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
      reviews: [],
    });
  }

  return lines;
}

function numberPaymentLines(lines: PaymentLine[]): PaymentLine[] {
  const totals: Record<string, number> = {};
  for (const line of lines) {
    totals[line.method] = (totals[line.method] || 0) + 1;
  }
  const seen: Record<string, number> = {};
  return lines.map((line) => {
    seen[line.method] = (seen[line.method] || 0) + 1;
    const n = seen[line.method];
    const kind = line.method === "POS" ? "POS" : "Transfer";
    return {
      ...line,
      label: totals[line.method] > 1 ? `${kind} ${n}` : kind,
    };
  });
}

export function SalesReportDetails({ report }: { report: SalesReportRow }) {
  const router = useRouter();

  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [reviewTargetId, setReviewTargetId] = React.useState<string | null>(null);
  const [reviewLogId, setReviewLogId] = React.useState<string | null>(null);
  const [reviewLine, setReviewLine] = React.useState<PaymentLine | null>(null);
  const [reviewStatus, setReviewStatus] = React.useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const [activeFileUrl, setActiveFileUrl] = React.useState<string | null>(null);
  const [activeFileName, setActiveFileName] = React.useState<string | undefined>();
  const [isFileViewerOpen, setIsFileViewerOpen] = React.useState(false);
  const [detailsRow, setDetailsRow] = React.useState<PaymentLine | null>(null);
  const [uploadingPaymentId, setUploadingPaymentId] = React.useState<string | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = React.useState(false);

  const flowParent = report.isDebtRepayment && report.parentSale ? report.parentSale : report;
  const flowChildren = React.useMemo(() => {
    const children = [...(flowParent.debtRepayments || [])];
    children.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    return children;
  }, [flowParent]);

  const paymentLines = React.useMemo<PaymentLine[]>(() => {
    return numberPaymentLines([
      ...buildPaymentLines(flowParent, "INITIAL_SALE", report.id),
      ...flowChildren.flatMap((child) => buildPaymentLines(child, "DEBT_REPAYMENT", report.id)),
    ]);
  }, [flowParent, flowChildren, report.id]);

  const metrics = React.useMemo(() => {
    const expected = Number(flowParent.litersSold) * Number(flowParent.pricePerLiter);
    const parentReceived = approvedReceived(flowParent);
    const approvedRepayments = flowChildren
      .reduce((sum, child) => sum + approvedReceived(child), 0);
    const pos = paymentLines.filter((line) => line.method === "POS").reduce((sum, line) => sum + line.amount, 0);
    const transfer = paymentLines
      .filter((line) => line.method === "TRANSFER")
      .reduce((sum, line) => sum + line.amount, 0);
    const appliedCredit = Number(flowParent.appliedCredit || 0);
    const received = parentReceived + approvedRepayments + appliedCredit;
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
      pendingApprovals: paymentLines.filter((line) => line.status === "PENDING").length,
      appliedCredit,
    };
  }, [flowParent, flowChildren, paymentLines]);

  const handleOpenReceipt = (url: string, name: string) => {
    setActiveFileUrl(url);
    setActiveFileName(name);
    setIsFileViewerOpen(true);
  };

  const handleOpenReviewModal = (line: PaymentLine) => {
    setReviewTargetId(line.paymentId);
    setReviewLogId(line.sourceId);
    setReviewLine(line);
    setReviewStatus(line.status === "REJECTED" ? "REJECTED" : "APPROVED");
    setReason(line.reason || "");
    setApiError(null);
    setReviewModalOpen(true);
  };

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTargetId) return;

    if (reason.trim().length < 5) {
      setApiError("Remarks are required (minimum 5 characters).");
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    const logId = reviewLogId || report.id;
    const res = await apiPatch(
      `/api/tenant/stations/${report.stationId}/sales-logs/${logId}/payments/${reviewTargetId}`,
      {
        status: reviewStatus,
        reason: reason.trim(),
      }
    );

    setIsSubmitting(false);

    if (res.error) {
      setApiError(res.error.message);
    } else {
      setReviewModalOpen(false);
      router.refresh();
    }
  };

  const handleUploadReceipt = async (paymentId: string, salesLogId: string, file: File) => {
    setUploadingPaymentId(paymentId);
    try {
      const sig = await apiPost<{
        uploadType: string;
        url: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        publicUrl?: string;
      }>("/api/tenant/upload/signature", { contentType: file.type });

      if (sig.error || !sig.data) {
        throw new Error(sig.error?.message ?? "Upload could not be started.");
      }

      let publicUrl = "";
      if (sig.data.uploadType === "cloudinary") {
        const formDataObj = new FormData();
        formDataObj.append("file", file);
        formDataObj.append("api_key", sig.data.apiKey);
        formDataObj.append("timestamp", sig.data.timestamp.toString());
        formDataObj.append("signature", sig.data.signature);
        const uploadRes = await fetch(sig.data.url, { method: "POST", body: formDataObj });
        if (!uploadRes.ok) throw new Error("Cloudinary upload failed.");
        const cloudinaryData = await uploadRes.json();
        publicUrl = cloudinaryData.secure_url;
      } else {
        const put = await fetch(sig.data.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!put.ok) throw new Error("Upload failed.");
        publicUrl = sig.data.publicUrl ?? "";
      }

      const res = await apiPatch(
        `/api/tenant/stations/${report.stationId}/sales-logs/${salesLogId}/payments/${paymentId}`,
        { receiptUrl: publicUrl }
      );
      if (res.error) throw new Error(res.error.message);

      if (reviewLine && reviewLine.paymentId === paymentId) {
        setReviewLine((prev) => (prev ? { ...prev, receiptUrl: publicUrl } : null));
      }

      toast.success("Receipt uploaded successfully.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setUploadingPaymentId(null);
    }
  };

  const handleDeleteReceipt = async (paymentId: string, salesLogId: string) => {
    setIsDeletingReceipt(true);
    try {
      const res = await apiPatch(
        `/api/tenant/stations/${report.stationId}/sales-logs/${salesLogId}/payments/${paymentId}`,
        { receiptUrl: null }
      );
      if (res.error) throw new Error(res.error.message);

      if (reviewLine && reviewLine.paymentId === paymentId) {
        setReviewLine((prev) => (prev ? { ...prev, receiptUrl: null } : null));
      }

      toast.success("Receipt removed successfully.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove receipt.";
      toast.error(msg);
    } finally {
      setIsDeletingReceipt(false);
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
        meta: { label: "Payment" },
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.label}</Badge>
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
        cell: ({ row }) => {
          const hasReceipt = Boolean(row.original.receiptUrl);
          const isPdf = row.original.receiptUrl?.toLowerCase().includes(".pdf");

          if (!hasReceipt) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return (
            <div className="flex items-center gap-2">
              {row.original.receiptUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={isUploading}
                  onClick={() =>
                    handleOpenReceipt(
                      row.original.receiptUrl!,
                      row.original.method === "POS" ? "POS Receipt" : "Transfer Receipt"
                    )
                  }
                >
                  {row.original.receiptUrl.toLowerCase().includes(".pdf") ? (
                    <FileText className="mr-1.5 size-3.5 text-primary" />
                  ) : (
                    <ImageIcon className="mr-1.5 size-3.5" />
                  )}
                  View
                </Button>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <label className={cn("inline-flex", (isUploading || anyUploading) && "pointer-events-none")}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                  className="hidden"
                  disabled={isUploading || anyUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    await handleUploadReceipt(row.original.paymentId, row.original.sourceId, file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  type="button"
                  disabled={isUploading || anyUploading}
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 size-3.5" />
                        Upload
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          );
        },
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
              disabled={row.original.paymentId === row.original.sourceId}
              onClick={() => handleOpenReviewModal(row.original)}
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
        [
          `POS ${fmtMoney(metrics.pos)} · Transfer ${fmtMoney(metrics.transfer)}`,
          metrics.repayments > 0
            ? `${metrics.repayments} repayment${metrics.repayments === 1 ? "" : "s"}`
            : null,
          metrics.appliedCredit > 0 ? `Credit ${fmtMoney(metrics.appliedCredit)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
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
        ) : report.status === "PARTIAL" ? (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10">
            Partial
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
                  <span>{detailsRow.label}</span>
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
                {detailsRow.receiptUrl && (
                  <div className="col-span-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full gap-1.5"
                      onClick={() =>
                        handleOpenReceipt(
                          detailsRow.receiptUrl!,
                          detailsRow.method === "POS" ? "POS Receipt" : "Transfer Receipt"
                        )
                      }
                    >
                      <ImageIcon className="size-3.5" />
                      View Receipt Document
                    </Button>
                  </div>
                )}
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

                {detailsRow.reviews.map((event) => {
                  const approved = event.status === "APPROVED";
                  return (
                    <div key={event.id} className="relative">
                      <div
                        className={cn(
                          "absolute top-1 -left-5 size-3 rounded-full border-2 border-background",
                          approved ? "bg-emerald-600" : "bg-rose-600"
                        )}
                      />
                      <div
                        className={cn(
                          "rounded-xl border bg-card p-4 shadow-sm",
                          approved
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-rose-500/20 bg-rose-500/5"
                        )}
                      >
                        <span
                          className={cn(
                            "mb-1 block text-sm font-semibold",
                            approved ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {detailsRow.label} {approved ? "approved" : "rejected"}
                        </span>
                        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="size-3.5" />
                          <span>
                            By <strong className="text-foreground">{userName(event.reviewedBy)}</strong>
                            {event.reviewedBy?.email ? ` (${event.reviewedBy.email})` : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.reviewedAt), "LLL dd, y p")}
                        </p>
                        {event.reason && (
                          <div className="mt-2 whitespace-pre-wrap rounded-lg border bg-background/60 p-3 text-sm italic text-muted-foreground">
                            {event.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {detailsRow.reviews.length === 0 && detailsRow.status !== "PENDING" && (
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
                        {detailsRow.label}{" "}
                        {detailsRow.status === "APPROVED" ? "approved" : "rejected"}
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
        <DialogContent
          showCloseButton={false}
          className="max-h-[92vh] overflow-y-auto sm:max-w-4xl lg:max-w-5xl"
        >
          <DialogHeader className="gap-0">
            <div className="flex items-center justify-between pb-2 border-b">
              <DialogTitle className="text-base font-semibold">Payment Review & Receipt</DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left Column: Receipt Preview & Fixed Footer Actions */}
            <div className="flex flex-col h-full rounded-xl border border-border/80 bg-muted/10 overflow-hidden">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b bg-muted/20">
                <span className="text-xs font-semibold text-foreground">Receipt Document</span>
                {reviewLine?.receiptUrl && (
                  <span className="text-[11px] text-muted-foreground">
                    {reviewLine.receiptUrl.toLowerCase().includes(".pdf")
                      ? "PDF Document"
                      : "Image Receipt"}
                  </span>
                )}
              </div>

              {/* Preview Center Box */}
              <div className="relative flex-1 flex flex-col items-center justify-center p-3 min-h-[280px] sm:min-h-[320px] bg-background/50 overflow-hidden">
                {reviewLine?.receiptUrl ? (
                  reviewLine.receiptUrl.toLowerCase().includes(".pdf") ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                        <FileText className="size-6" />
                      </div>
                      <p className="text-xs font-medium text-foreground">PDF Receipt Attached</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Click &quot;View in another tab&quot; below to open the PDF.
                      </p>
                    </div>
                  ) : (
                    <div className="relative flex size-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={reviewLine.receiptUrl}
                        alt="Receipt preview"
                        className="max-h-[300px] w-full rounded-md object-contain"
                      />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                    <p className="text-xs font-medium text-foreground">No Receipt Attached</p>
                    <p className="mt-0.5 max-w-[220px] text-[11px] text-muted-foreground">
                      No document has been uploaded for this payment yet.
                    </p>
                  </div>
                )}

                {/* Loading Overlay */}
                {(uploadingPaymentId === reviewLine?.paymentId || isDeletingReceipt) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="mt-1.5 text-xs font-medium text-muted-foreground">
                      {isDeletingReceipt ? "Deleting receipt..." : "Uploading receipt..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Fixed Footer with Action Buttons below Preview */}
              <div className="border-t bg-card/95 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  {/* Upload / Reupload */}
                  <label
                    className={cn(
                      "inline-flex",
                      (uploadingPaymentId !== null || isDeletingReceipt) && "pointer-events-none opacity-50"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                      className="hidden"
                      disabled={uploadingPaymentId !== null || isDeletingReceipt}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file || !reviewLine) return;
                        await handleUploadReceipt(reviewLine.paymentId, reviewLine.sourceId, file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      type="button"
                      disabled={uploadingPaymentId !== null || isDeletingReceipt}
                      asChild
                    >
                      <span>
                        <Upload className="size-3.5" />
                        {reviewLine?.receiptUrl ? "Reupload" : "Upload"}
                      </span>
                    </Button>
                  </label>

                  {/* View in another tab */}
                  {reviewLine?.receiptUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      type="button"
                      disabled={uploadingPaymentId !== null || isDeletingReceipt}
                      onClick={() => {
                        if (reviewLine?.receiptUrl) {
                          window.open(reviewLine.receiptUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <ExternalLink className="size-3.5" />
                      View in another tab
                    </Button>
                  )}
                </div>

                {/* Delete button */}
                {reviewLine?.receiptUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50"
                    type="button"
                    disabled={uploadingPaymentId !== null || isDeletingReceipt}
                    onClick={() => {
                      if (reviewLine) {
                        handleDeleteReceipt(reviewLine.paymentId, reviewLine.sourceId);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column: Compact Payment Summary & Review Form */}
            <div className="flex flex-col space-y-4">
              {/* Compact Summary Card */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Summary
                  </span>
                  <span className="text-base font-bold tracking-tight text-foreground">
                    {reviewLine ? fmtMoney(reviewLine.amount) : "₦0.00"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 border-t text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Method: </span>
                    <span className="font-medium text-foreground">{reviewLine?.method ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source: </span>
                    <span className="font-medium text-foreground">
                      {reviewLine?.sourceType === "INITIAL_SALE" ? "Initial sale" : "Debt repayment"}
                    </span>
                  </div>
                  <div className="truncate" title={reviewLine?.bankName}>
                    <span className="text-muted-foreground">Bank: </span>
                    <span className="font-medium text-foreground">{reviewLine?.bankName ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account: </span>
                    <span className="font-mono text-foreground">{reviewLine?.accountNumber ?? "—"}</span>
                  </div>
                  {reviewLine?.accountName && reviewLine.accountName !== "—" && (
                    <div className="col-span-2 truncate" title={reviewLine.accountName}>
                      <span className="text-muted-foreground">Account Name: </span>
                      <span className="font-medium text-foreground">{reviewLine.accountName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium text-foreground">
                      {reviewLine ? format(new Date(reviewLine.logDate), "LLL dd, y") : "—"}
                    </span>
                  </div>
                  <div className="truncate" title={userName(reviewLine?.recordedBy)}>
                    <span className="text-muted-foreground">By: </span>
                    <span className="font-medium text-foreground">{userName(reviewLine?.recordedBy)}</span>
                  </div>
                </div>
              </div>

              {/* Review Form or Legacy Notice */}
              {reviewLine && reviewLine.paymentId === reviewLine.sourceId ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  This payment was recorded before individual payment reviews were enabled and cannot be reviewed separately.
                </div>
              ) : (
                <form onSubmit={handleReviewReport} className="flex flex-col space-y-3 pt-0.5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Review Decision</Label>
                    <Select
                      value={reviewStatus}
                      onValueChange={(val) => setReviewStatus(val as "APPROVED" | "REJECTED")}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approve this payment</SelectItem>
                        <SelectItem value="REJECTED">Reject this payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="review-reason" className="text-sm font-semibold">
                        Remarks <span className="text-rose-600">*</span>
                      </Label>
                      <span
                        className={cn(
                          "text-[11px]",
                          reason.trim().length < 5
                            ? "text-muted-foreground"
                            : "text-emerald-600 font-medium"
                        )}
                      >
                        {reason.trim().length}/5 chars min
                      </span>
                    </div>
                    <Textarea
                      id="review-reason"
                      placeholder="Enter remarks (minimum 5 characters)..."
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (apiError) setApiError(null);
                      }}
                      className="min-h-[85px] resize-none text-sm"
                    />
                  </div>

                  {apiError && <p className="text-xs font-medium text-rose-600">{apiError}</p>}

                  <Button
                    type="submit"
                    disabled={isSubmitting || uploadingPaymentId !== null || isDeletingReceipt}
                    className={cn(
                      "h-10 w-full gap-2 font-medium",
                      reviewStatus === "REJECTED" && "bg-rose-600 text-white hover:bg-rose-700"
                    )}
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
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
