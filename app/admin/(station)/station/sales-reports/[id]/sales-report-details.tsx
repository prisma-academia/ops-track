"use client";

import { useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, User, CheckCircle2, AlertCircle, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
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

interface DebtRepayment {
  id: string;
  amountPos: number;
  amountTransfer: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  logDate: string | Date;
  posReceiptUrl?: string | null;
  transferReceiptUrl?: string | null;
  recordedBy?: SalesReportUser | null;
  approvedBy?: SalesReportUser | null;
  reason?: string | null;

}

interface SalesReportRow {
  id: string;
  tenantId: string;
  stationId: string;
  productType: string;
  amountPos: number;
  amountTransfer: number;
  litersSold: number;
  pricePerLiter: number;
  logDate: string | Date;
  status: "PENDING" | "APPROVED" | "REJECTED";

  reason: string | null;
  approvedById: string | null;
  approvedAt: string | Date | null;
  station: SalesReportStation;
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
  isDebtRepayment?: boolean;
  parentSaleId?: string | null;

  parentSale?: {
    id: string;
    logDate: string | Date;
    productType: string;
    litersSold: number;
    pricePerLiter: number;
    amountPos: number;
    amountTransfer: number;
    posReceiptUrl: string | null;
    transferReceiptUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    recordedBy: SalesReportUser | null;
    approvedBy: SalesReportUser | null;
    reason: string | null;

    debtRepayments: DebtRepayment[];
  } | null;
  debtRepayments?: DebtRepayment[];
}

export function SalesReportDetails({ report }: { report: SalesReportRow }) {
  const router = useRouter();

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);
  
  // Review Form State
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // File Viewer State
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | undefined>();
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Collapsible State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Determine Flow Table Data
  let flowParent: any = null;
  let flowChildren: any[] = [];

  if (report.isDebtRepayment && report.parentSale) {
    flowParent = report.parentSale;
    flowChildren = report.parentSale.debtRepayments || [];
  } else {
    flowParent = report;
    flowChildren = report.debtRepayments || [];
  }

  // Pre-sort children by date
  flowChildren.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());

  let currentBalance = 0;
  
  if (flowParent) {
    const pExpected = Number(flowParent.litersSold) * Number(flowParent.pricePerLiter);
    const pPaid = Number(flowParent.amountPos) + Number(flowParent.amountTransfer);
    currentBalance = pExpected - pPaid;
  }

  const renderTimeline = (rowReport: any) => (
    <div className="p-4 bg-muted/10 border-b border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1 mb-4">Timeline & Logging details</h3>
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        <div className="relative">
          <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
          <div className="bg-card border rounded-xl p-4 shadow-sm w-full md:w-1/2">
            <span className="text-sm font-semibold block mb-1">Sales Log Submitted</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="size-3.5" />
              <span>
                By <strong className="text-foreground">{rowReport.recordedBy ? `${rowReport.recordedBy.firstName ?? ""} ${rowReport.recordedBy.lastName ?? ""}`.trim() : "Unknown"}</strong> ({rowReport.recordedBy?.email || "No email"})
              </span>
            </div>
          </div>
        </div>

        {rowReport.status !== "PENDING" && (
          <div className="relative">
            <div className={`absolute -left-[20px] top-1 size-3 rounded-full border-2 border-background ${rowReport.status === "APPROVED" ? "bg-emerald-600" : "bg-rose-600"}`} />
            <div className={`bg-card border rounded-xl p-4 shadow-sm w-full md:w-1/2 ${rowReport.status === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
              <span className={`text-sm font-semibold block mb-1 ${rowReport.status === "APPROVED" ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                {rowReport.status === "APPROVED" ? "Report Approved" : "Report Rejected"}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <User className="size-3.5" />
                <span>
                  By <strong className="text-foreground">{rowReport.approvedBy ? `${rowReport.approvedBy.firstName ?? ""} ${rowReport.approvedBy.lastName ?? ""}`.trim() : "Supervisor"}</strong> ({rowReport.approvedBy?.email || "No email"})
                </span>
              </div>
              
              {rowReport.reason && (
                <div className="text-sm bg-background/60 p-3 rounded-lg border mb-3 whitespace-pre-wrap italic text-muted-foreground">
                  {rowReport.reason}
                </div>
              )}
              
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
          <Link href="/admin/station/sales-reports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Report Details</h1>
          <p className="text-sm text-muted-foreground">
            Logged for {formatHumanReadableDate(report.logDate)} at {report.station?.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
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

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          {/* Summary Stats Grid */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
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
                <div className="p-4">
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase tracking-wider mb-1">Volume Sold</span>
                  <span className="font-bold text-foreground font-mono text-base">{Number(report.litersSold).toLocaleString()} L</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] text-muted-foreground block font-medium uppercase tracking-wider mb-1">Unit Price</span>
                  <span className="font-semibold text-foreground font-mono text-base">{formatShortCurrency(Number(report.pricePerLiter))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flow Table / Explanatory Table */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Debt & Repayment Flow</CardTitle>
              <p className="text-xs text-muted-foreground">This table shows the initial sale revenue vs expected, and any subsequent debt repayments.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground">
                    <th className="py-3 px-4 font-medium text-left">Date</th>
                    <th className="py-3 px-4 font-medium text-left">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Expected Rev</th>
                    <th className="py-3 px-4 font-medium text-right">Total Received</th>
                    <th className="py-3 px-4 font-medium text-right">Balance</th>
                    <th className="py-3 px-4 font-medium text-center">Receipts</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {/* Parent Sale Row */}
                  {flowParent && (
                    <Fragment>
                      <tr className={flowParent.id === report.id ? "bg-primary/5" : ""}>
                        <td className="py-4 px-4 whitespace-nowrap">{formatHumanReadableDate(flowParent.logDate)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-medium">Initial Sale</td>
                        <td className="py-4 px-4 text-right font-mono tabular-nums whitespace-nowrap text-slate-600">{formatShortCurrency(Number(flowParent.litersSold) * Number(flowParent.pricePerLiter))}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-emerald-600">{formatShortCurrency(Number(flowParent.amountPos) + Number(flowParent.amountTransfer))}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-rose-600">{formatShortCurrency(currentBalance)}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {flowParent.posReceiptUrl && (
                              <Button variant="outline" size="icon" className="size-7" onClick={() => handleOpenReceipt(flowParent.posReceiptUrl, "POS Receipt")}>
                                <ImageIcon className="size-3 text-muted-foreground" />
                              </Button>
                            )}
                            {flowParent.transferReceiptUrl && (
                              <Button variant="outline" size="icon" className="size-7" onClick={() => handleOpenReceipt(flowParent.transferReceiptUrl, "Transfer Receipt")}>
                                <ImageIcon className="size-3 text-muted-foreground text-blue-500" />
                              </Button>
                            )}
                            {!flowParent.posReceiptUrl && !flowParent.transferReceiptUrl && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant="outline" className={
                              flowParent.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                              flowParent.status === "REJECTED" ? "bg-rose-50 text-rose-600 border-rose-200" :
                              "bg-amber-50 text-amber-600 border-amber-200"
                            }>
                              {flowParent.status}
                            </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleOpenReviewModal(flowParent.id, flowParent.status)}>Review</Button>
                            <Button size="sm" variant="outline" onClick={() => toggleRow(flowParent.id)}>
                              Details
                              {expandedRows[flowParent.id] ? <ChevronUp className="size-4 ml-1" /> : <ChevronDown className="size-4 ml-1" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows[flowParent.id] && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            {renderTimeline(flowParent)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )}
                  
                  {/* Children Rows */}
                  {flowChildren.map((child) => {
                    const childPaid = Number(child.amountPos) + Number(child.amountTransfer);
                    if (child.status === "APPROVED") {
                      currentBalance -= childPaid;
                    }
                    return (
                      <Fragment key={child.id}>
                        <tr className={child.id === report.id ? "bg-primary/5" : ""}>
                          <td className="py-4 px-4 whitespace-nowrap relative text-muted-foreground pl-8">
                            <div className="absolute left-4 top-0 bottom-1/2 border-l border-b border-border/80 w-3 rounded-bl"></div>
                            {formatHumanReadableDate(child.logDate)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap text-blue-600 font-medium">Debt Repayment</td>
                          <td className="py-4 px-4 text-right text-muted-foreground">—</td>
                          <td className="py-4 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-emerald-600">+{formatShortCurrency(childPaid)}</td>
                          <td className="py-4 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-rose-600">
                            {child.status === "APPROVED" ? formatShortCurrency(currentBalance) : <span className="text-xs font-normal text-amber-600">(Pending Approval)</span>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {child.posReceiptUrl && (
                                <Button variant="outline" size="icon" className="size-7" onClick={() => handleOpenReceipt(child.posReceiptUrl, "POS Receipt")}>
                                  <ImageIcon className="size-3 text-muted-foreground" />
                                </Button>
                              )}
                              {child.transferReceiptUrl && (
                                <Button variant="outline" size="icon" className="size-7" onClick={() => handleOpenReceipt(child.transferReceiptUrl, "Transfer Receipt")}>
                                  <ImageIcon className="size-3 text-muted-foreground text-blue-500" />
                                </Button>
                              )}
                              {!child.posReceiptUrl && !child.transferReceiptUrl && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge variant="outline" className={
                                child.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                child.status === "REJECTED" ? "bg-rose-50 text-rose-600 border-rose-200" :
                                "bg-amber-50 text-amber-600 border-amber-200"
                              }>
                                {child.status}
                              </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handleOpenReviewModal(child.id, child.status)}>Review</Button>
                              <Button size="sm" variant="outline" onClick={() => toggleRow(child.id)}>
                                Details
                                {expandedRows[child.id] ? <ChevronUp className="size-4 ml-1" /> : <ChevronDown className="size-4 ml-1" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedRows[child.id] && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              {renderTimeline(child)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/10 border-t-2 border-border/60">
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-right font-semibold text-muted-foreground">Final Outstanding Debt:</td>
                    <td className="py-4 px-4 text-right font-mono font-black text-lg text-foreground tabular-nums">{formatShortCurrency(currentBalance)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reusable File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        fileUrl={activeFileUrl}
        fileName={activeFileName}
      />

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Decision</DialogTitle>
            <DialogDescription>
              Please review the report details and provide an approval decision.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewReport} className="space-y-5 py-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
