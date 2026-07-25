"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { formatHumanReadableDate, formatShortCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/client/api";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { FileViewerModal } from "@/components/file-viewer-modal";

interface SalesReportStation {
  id: string;
  name: string;
  code: string;
}

interface SalesReportUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface SalesReportRow {
  id: string;
  tenantId: string;
  stationId: string;
  productType: string;
  litersSold: number;
  amountCash: number;
  amountPos: number;
  amountTransfer: number;
  cashReceiptUrl: string | null;
  posReceiptUrl: string | null;
  logDate: string | Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  flaggedAmount: boolean;
  flaggedLiters: boolean;
  flaggedReceipt: boolean;
  reason: string | null;
  approvedById: string | null;
  approvedAt: string | Date | null;
  station: SalesReportStation;
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
  isDebtRepayment?: boolean;
  parentSaleId?: string | null;
}


export function SalesReportDetails({ report }: { report: SalesReportRow }) {
  const router = useRouter();

  // Review State
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">(
    report.status === "REJECTED" ? "REJECTED" : "APPROVED"
  );
  const [flaggedAmount, setFlaggedAmount] = useState(report.flaggedAmount);
  const [flaggedLiters, setFlaggedLiters] = useState(report.flaggedLiters);
  const [flaggedReceipt, setFlaggedReceipt] = useState(report.flaggedReceipt);
  const [reason, setReason] = useState(report.reason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // File Viewer State
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | undefined>();
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  const handleOpenReceipt = (url: string, name: string) => {
    setActiveFileUrl(url);
    setActiveFileName(name);
    setIsFileViewerOpen(true);
  };

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reviewStatus === "REJECTED" && !reason.trim()) {
      setApiError("Rejection reason is required.");
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    const res = await apiPatch(`/api/tenant/stations/${report.stationId}/sales-logs/${report.id}`, {
      status: reviewStatus,
      flaggedAmount,
      flaggedLiters,
      flaggedReceipt,
      reason: reason.trim() || null,
    });

    setIsSubmitting(false);

    if (res.error) {
      setApiError(res.error.message);
    } else {
      router.refresh();
      router.push("/admin/sales-reports");
    }
  };

  const totalRevenue = Number(report.amountCash) + Number(report.amountPos) + Number(report.amountTransfer);

  return (
    <div className="flex-1 p-6 sm:p-8 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Header and Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
          <Link href="/admin/sales-reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Report Details</h1>
          <p className="text-sm text-muted-foreground">
            Logged for {formatHumanReadableDate(report.logDate)} at {report.station?.name}
          </p>
        </div>
        <div className="ml-auto">
          {report.status === "APPROVED" ? (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-sm px-3 py-1">
              <CheckCircle2 className="size-4 mr-1.5" /> Approved
            </Badge>
          ) : report.status === "REJECTED" ? (
            <Badge variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-sm px-3 py-1">
              <AlertCircle className="size-4 mr-1.5" /> Rejected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-sm px-3 py-1">
              Pending Review
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Summary Stats Grid */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-base font-semibold">Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/40">
                <div className="p-4 sm:p-5">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider mb-1">Station</span>
                  <span className="font-semibold text-foreground text-sm">{report.station?.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">({report.station?.code})</span>
                </div>
                <div className="p-4 sm:p-5">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider mb-1">Product</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {report.productType}
                    </Badge>
                    {report.isDebtRepayment && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold text-[10px]">
                        Debt Repayment
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider mb-1">Volume Sold</span>
                  <span className="font-bold text-foreground font-mono text-lg">{Number(report.litersSold).toLocaleString()} L</span>
                </div>
                <div className="p-4 sm:p-5">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider mb-1">Total Revenue</span>
                  <span className="font-bold text-primary font-mono text-lg">{formatShortCurrency(totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3 divide-y divide-border/20 text-sm">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-muted-foreground">Cash Revenue</span>
                  <span className="font-semibold font-mono text-base">{formatShortCurrency(Number(report.amountCash))}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">POS Revenue</span>
                  <span className="font-semibold font-mono text-base">{formatShortCurrency(Number(report.amountPos))}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Bank Transfer</span>
                  <span className="font-semibold font-mono text-base">{formatShortCurrency(Number(report.amountTransfer))}</span>
                </div>
                <div className="flex justify-between items-center pt-3 font-bold text-lg border-t border-border/40">
                  <span>Total Deposit/Revenue</span>
                  <span className="text-primary">{formatShortCurrency(totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Files */}
          {(report.cashReceiptUrl || report.posReceiptUrl) && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" /> Receipt Files
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {report.cashReceiptUrl && (
                  <div className="flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors p-3.5 rounded-xl border border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-lg border shadow-xs">
                        <FileText className="size-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">Cash Teller Receipt</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleOpenReceipt(report.cashReceiptUrl!, "Cash Teller Receipt")}
                    >
                      View Receipt
                    </Button>
                  </div>
                )}
                {report.posReceiptUrl && (
                  <div className="flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors p-3.5 rounded-xl border border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-lg border shadow-xs">
                        <FileText className="size-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">POS Settlement Receipt</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleOpenReceipt(report.posReceiptUrl!, "POS Settlement Receipt")}
                    >
                      View Receipt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Timeline / Status Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Timeline & Approval</h3>
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              <div className="relative">
                <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
                <div className="bg-card border rounded-xl p-4 shadow-sm">
                  <span className="text-sm font-semibold block mb-1">Sales Log Submitted</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    <span>
                      By <strong className="text-foreground">{report.recordedBy ? `${report.recordedBy.firstName ?? ""} ${report.recordedBy.lastName ?? ""}`.trim() : "Unknown"}</strong> ({report.recordedBy?.email || "No email"})
                    </span>
                  </div>
                </div>
              </div>

              {report.status !== "PENDING" && (
                <div className="relative">
                  <div className={`absolute -left-[20px] top-1 size-3 rounded-full border-2 border-background ${report.status === "APPROVED" ? "bg-emerald-600" : "bg-rose-600"}`} />
                  <div className={`bg-card border rounded-xl p-4 shadow-sm ${report.status === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
                    <span className={`text-sm font-semibold block mb-1 ${report.status === "APPROVED" ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                      {report.status === "APPROVED" ? "Report Approved" : "Report Rejected"}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <User className="size-3.5" />
                      <span>
                        By <strong className="text-foreground">{report.approvedBy ? `${report.approvedBy.firstName ?? ""} ${report.approvedBy.lastName ?? ""}`.trim() : "Supervisor"}</strong> ({report.approvedBy?.email || "No email"})
                      </span>
                    </div>
                    
                    {report.reason && (
                      <div className="text-sm bg-background/60 p-3 rounded-lg border mb-3 whitespace-pre-wrap italic text-muted-foreground">
                        {report.reason}
                      </div>
                    )}
                    
                    {(report.flaggedAmount || report.flaggedLiters || report.flaggedReceipt) && (
                      <div className="flex flex-wrap gap-2">
                        {report.flaggedAmount && <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-100">Flagged: Amount</Badge>}
                        {report.flaggedLiters && <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-100">Flagged: Liters</Badge>}
                        {report.flaggedReceipt && <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-100">Flagged: Receipt</Badge>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Review Action Panel */}
        <div className="md:col-span-1">
          <div className="sticky top-6">
            <Card className={report.status === "PENDING" ? "border-primary/30 shadow-md ring-1 ring-primary/10" : "shadow-sm"}>
              <CardHeader className={report.status === "PENDING" ? "bg-primary/5 pb-4" : "pb-4"}>
                <CardTitle className="text-lg">Review Decision</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.status === "PENDING" 
                    ? "Please review the report details and provide an approval decision." 
                    : "You can update the review decision below if needed."}
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                <form onSubmit={handleReviewReport} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold">Action</Label>
                    <Select value={reviewStatus} onValueChange={(val) => setReviewStatus(val as "APPROVED" | "REJECTED")}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approve Report</SelectItem>
                        <SelectItem value="REJECTED">Reject Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Flag Checkboxes */}
                  <div className="space-y-3 bg-muted/30 border rounded-xl p-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Issue Flags (Optional)</span>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="flag-liters" checked={flaggedLiters} onCheckedChange={(val) => setFlaggedLiters(!!val)} />
                        <label htmlFor="flag-liters" className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Volume Discrepancy</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="flag-amount" checked={flaggedAmount} onCheckedChange={(val) => setFlaggedAmount(!!val)} />
                        <label htmlFor="flag-amount" className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Revenue Amount Mismatch</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="flag-receipt" checked={flaggedReceipt} onCheckedChange={(val) => setFlaggedReceipt(!!val)} />
                        <label htmlFor="flag-receipt" className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Missing/Invalid Receipt</label>
                      </div>
                    </div>
                  </div>

                  {/* Comments / Reason Textarea */}
                  <div className="space-y-2.5">
                    <Label htmlFor="review-reason" className={`text-sm font-semibold ${reviewStatus === "REJECTED" ? "text-rose-600 dark:text-rose-500" : ""}`}>
                      Remarks {reviewStatus === "REJECTED" && "*"}
                    </Label>
                    <Textarea
                      id="review-reason"
                      placeholder={reviewStatus === "REJECTED" ? "Specify why the report is rejected..." : "Add any notes or remarks..."}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </div>

                  {apiError && <p className="text-sm text-rose-600 dark:text-rose-500 font-medium">{apiError}</p>}

                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={`w-full h-11 gap-2 ${reviewStatus === "REJECTED" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerEllipsis />
                        <span>Saving...</span>
                      </>
                    ) : (
                      reviewStatus === "APPROVED" ? "Save & Approve" : "Save & Reject"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reusable File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        fileUrl={activeFileUrl}
        fileName={activeFileName}
      />
    </div>
  );
}
