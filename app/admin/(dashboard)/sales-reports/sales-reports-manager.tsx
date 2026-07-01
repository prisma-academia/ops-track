"use client";
import { useState, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, Droplets, Banknote, ChartColumnIncreasing, Handbag, CalendarIcon, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/client/api";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

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
}

export function SalesReportsManager({
  initialReports,
  stations,
}: {
  initialReports: SalesReportRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedStationId, setSelectedStationId] = useState<string>("ALL");
  
  // Review Dialog State
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SalesReportRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [flaggedAmount, setFlaggedAmount] = useState(false);
  const [flaggedLiters, setFlaggedLiters] = useState(false);
  const [flaggedReceipt, setFlaggedReceipt] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filtering logic
  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      // Filter by station
      if (selectedStationId !== "ALL" && report.stationId !== selectedStationId) {
        return false;
      }

      // Filter by date
      const logDate = new Date(report.logDate);
      if (dateRange?.from) {
        const sDate = new Date(dateRange.from);
        sDate.setHours(0, 0, 0, 0);
        if (logDate < sDate) return false;
      }
      if (dateRange?.to) {
        const eDate = new Date(dateRange.to);
        eDate.setHours(23, 59, 59, 999);
        if (logDate > eDate) return false;
      }
      return true;
    });
  }, [initialReports, dateRange, selectedStationId]);

  // Analytics computation
  const stats = useMemo(() => {
    let totalLiters = 0;
    let cash = 0;
    let digital = 0;

    filteredReports.forEach((r) => {
      totalLiters += Number(r.litersSold);
      cash += Number(r.amountCash);
      digital += Number(r.amountPos) + Number(r.amountTransfer);
    });

    return { totalLiters, cash, digital };
  }, [filteredReports]);

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    if (reviewStatus === "REJECTED" && !reason.trim()) {
      setApiError("Rejection reason is required.");
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    const res = await apiPatch(`/api/tenant/stations/${selectedReport.stationId}/sales-logs/${selectedReport.id}`, {
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
      closeDialog();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedReport(null);
    setReviewStatus("APPROVED");
    setFlaggedAmount(false);
    setFlaggedLiters(false);
    setFlaggedReceipt(false);
    setReason("");
    setApiError(null);
    router.refresh();
  };

  const EcommerceActions = [
    {
      title: "Transactions",
      subtitle: filteredReports.length.toString(),
      cardIcon: Handbag,
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
      statusValue: "Period",
    },
    {
      title: "Volume Sold",
      subtitle: `${stats.totalLiters.toLocaleString()} L`,
      cardIcon: Droplets,
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
      statusValue: "Period",
    },
    {
      title: "Cash Revenue",
      subtitle: `₦${stats.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cardIcon: Banknote,
      badgeColor: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
      statusValue: "Period",
    },
    {
      title: "Digital Revenue",
      subtitle: `₦${stats.digital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cardIcon: ChartColumnIncreasing,
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
      statusValue: "Period",
    },
  ];

  const columns: ColumnDef<SalesReportRow>[] = [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ row }) => {
        return <span className="font-medium">{formatHumanReadableDate(row.original.logDate)}</span>;
      },
    },
    {
      id: "station_name",
      accessorFn: (row) => row.station?.name,
      header: "Station",
      cell: ({ row }) => {
        const station = row.original.station;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{station?.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{station?.code}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "productType",
      header: "Product",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      accessorKey: "litersSold",
      header: () => <div className="text-right">Volume Sold</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground">
          {Number(row.original.litersSold).toLocaleString()} L
        </div>
      ),
    },
    {
      id: "revenue",
      header: () => <div className="text-right">Total Revenue</div>,
      cell: ({ row }) => {
        const total = Number(row.original.amountCash) + Number(row.original.amountPos) + Number(row.original.amountTransfer);
        return (
          <div className="text-right font-bold text-foreground">
            ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const report = row.original;
        const status = report.status;
        const flags = [];
        if (report.flaggedAmount) flags.push("Amount");
        if (report.flaggedLiters) flags.push("Liters");
        if (report.flaggedReceipt) flags.push("Receipt");

        return (
          <div className="flex flex-col gap-1 py-1">
            {status === "APPROVED" ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 w-fit">
                Approved
              </Badge>
            ) : status === "REJECTED" ? (
              <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 w-fit">
                Rejected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 w-fit">
                Pending
              </Badge>
            )}
            {flags.length > 0 && (
              <span className="text-[10px] text-rose-500 font-semibold leading-none mt-0.5">
                Flagged: {flags.join(", ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "recordedBy",
      header: "Recorded By",
      cell: ({ row }) => {
        const user = row.original.recordedBy;
        const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown";
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3" />
            <span>{name}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Action</div>,
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="flex items-center gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedReport(report);
                setActiveDialog("review");
                if (report.status !== "PENDING") {
                  setReviewStatus(report.status);
                  setFlaggedAmount(report.flaggedAmount);
                  setFlaggedLiters(report.flaggedLiters);
                  setFlaggedReceipt(report.flaggedReceipt);
                  setReason(report.reason || "");
                }
              }}
              className="flex items-center gap-1 h-8 px-3 rounded-4xl"
            >
              <Eye className="size-3.5" /> Details
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Filters and Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card text-card-foreground p-6 rounded-xl border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground text-sm">Monitor daily sales logs across all your stations.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          {/* Station Dropdown */}
          <div className="space-y-1 w-full sm:w-48">
            <Label className="text-xs text-muted-foreground">Station</Label>
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stations</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker Range */}
          <div className="space-y-1 w-full sm:w-auto">
            <Label htmlFor="date-picker-range" className="text-xs text-muted-foreground">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date-picker-range"
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="w-full">
        <Card className="p-0 shadow-xs border-border/40">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {EcommerceActions.map((item, index) => {
              return (
                <div
                  className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0"
                  key={index}
                >
                  <div className="p-6 flex items-start justify-between">
                    <div className="flex flex-col gap-4">
                      <p className="text-base font-medium text-card-foreground">
                        {item.title}
                      </p>
                      <div>
                        <p className="text-2xl font-medium text-card-foreground">
                          {item.subtitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Filtered
                          </p>
                          <Badge
                            className={cn(
                              "font-medium text-[10px] uppercase tracking-wider",
                              item.badgeColor,
                            )}
                          >
                            {item.statusValue}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {/* icon */}
                    <div className="p-3 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                      <item.cardIcon size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredReports}
        title=""
        description=""
        filterColumnId="station_name"
        searchPlaceholder="Search by station name…"
      />

      {/* ==========================================
          SALES REPORT REVIEW/DETAILS DIALOG
      ========================================== */}
      {activeDialog === "review" && selectedReport && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg font-bold">Sales Report Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 overflow-y-auto pr-2 pb-2 flex-1">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-2xl border border-border/40">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Station</span>
                  <span className="font-semibold text-foreground">{selectedReport.station?.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">({selectedReport.station?.code})</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Log Date</span>
                  <span className="font-semibold text-foreground">{formatHumanReadableDate(selectedReport.logDate)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Product</span>
                  <Badge variant="secondary" className="mt-1 font-mono text-[10px]">
                    {selectedReport.productType}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Volume Sold</span>
                  <span className="font-bold text-foreground font-mono">{Number(selectedReport.litersSold).toLocaleString()} L</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 border border-border/30 rounded-2xl p-4 bg-background">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Financial Summary</span>
                <div className="space-y-1.5 divide-y divide-border/20 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Cash Revenue</span>
                    <span className="font-semibold font-mono">₦{Number(selectedReport.amountCash).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">POS Revenue</span>
                    <span className="font-semibold font-mono">₦{Number(selectedReport.amountPos).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Bank Transfer</span>
                    <span className="font-semibold font-mono">₦{Number(selectedReport.amountTransfer).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-bold text-base">
                    <span>Total Revenue</span>
                    <span className="text-primary">₦{(Number(selectedReport.amountCash) + Number(selectedReport.amountPos) + Number(selectedReport.amountTransfer)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Receipt URLs */}
              {(selectedReport.cashReceiptUrl || selectedReport.posReceiptUrl) && (
                <div className="space-y-2 border border-border/30 rounded-2xl p-4 bg-background">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Receipt Files</span>
                  <div className="space-y-2 text-sm">
                    {selectedReport.cashReceiptUrl && (
                      <div className="flex justify-between items-center bg-muted/10 p-2.5 rounded-lg border">
                        <span className="truncate max-w-xs text-xs">Cash Teller Receipt</span>
                        <a href={selectedReport.cashReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold shrink-0">
                          View Receipt
                        </a>
                      </div>
                    )}
                    {selectedReport.posReceiptUrl && (
                      <div className="flex justify-between items-center bg-muted/10 p-2.5 rounded-lg border">
                        <span className="truncate max-w-xs text-xs">POS Settlement Receipt</span>
                        <a href={selectedReport.posReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold shrink-0">
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Timeline / Status Details */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block font-medium">Timeline & Approval</span>
                <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                  <div className="relative">
                    <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
                    <div>
                      <span className="text-sm font-semibold block">Sales Log Logged</span>
                      <span className="text-xs text-muted-foreground block">
                        By <strong>{selectedReport.recordedBy ? `${selectedReport.recordedBy.firstName ?? ""} ${selectedReport.recordedBy.lastName ?? ""}`.trim() : "Unknown"}</strong> ({selectedReport.recordedBy?.email || "No email"})
                      </span>
                    </div>
                  </div>

                  {selectedReport.status !== "PENDING" && (
                    <div className="relative">
                      <div className={`absolute -left-[20px] top-1 size-3 rounded-full border-2 border-background ${selectedReport.status === "APPROVED" ? "bg-emerald-600" : "bg-rose-600"}`} />
                      <div>
                        <span className={`text-sm font-semibold block ${selectedReport.status === "APPROVED" ? "text-emerald-600" : "text-rose-600"}`}>
                          {selectedReport.status === "APPROVED" ? "Approved" : "Rejected"}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          By <strong>{selectedReport.approvedBy ? `${selectedReport.approvedBy.firstName ?? ""} ${selectedReport.approvedBy.lastName ?? ""}`.trim() : "Supervisor"}</strong> ({selectedReport.approvedBy?.email || "No email"})
                        </span>
                        {selectedReport.reason && (
                          <p className="text-xs bg-muted/40 p-2.5 rounded-lg border mt-1.5 whitespace-pre-wrap italic">
                            Reason: "{selectedReport.reason}"
                          </p>
                        )}
                        {(selectedReport.flaggedAmount || selectedReport.flaggedLiters || selectedReport.flaggedReceipt) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedReport.flaggedAmount && <Badge variant="destructive" className="text-[10px] py-0.5">Flagged: Amount</Badge>}
                            {selectedReport.flaggedLiters && <Badge variant="destructive" className="text-[10px] py-0.5">Flagged: Liters</Badge>}
                            {selectedReport.flaggedReceipt && <Badge variant="destructive" className="text-[10px] py-0.5">Flagged: Receipt</Badge>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Input Section (if PENDING) */}
              {selectedReport.status === "PENDING" && (
                <form onSubmit={handleReviewReport} className="space-y-4 pt-4 border-t">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Perform Review Decision</span>
                  
                  <div className="space-y-2">
                    <Label>Approval Decision</Label>
                    <Select value={reviewStatus} onValueChange={(val) => setReviewStatus(val as "APPROVED" | "REJECTED")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approve Report</SelectItem>
                        <SelectItem value="REJECTED">Reject Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Flag Checkboxes */}
                  <div className="space-y-2 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4">
                    <span className="text-xs font-semibold text-rose-600 block mb-2">Review Flags (Optional)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="flag-liters" checked={flaggedLiters} onCheckedChange={(val) => setFlaggedLiters(!!val)} />
                        <label htmlFor="flag-liters" className="text-xs font-medium cursor-pointer">Liters Sold</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="flag-amount" checked={flaggedAmount} onCheckedChange={(val) => setFlaggedAmount(!!val)} />
                        <label htmlFor="flag-amount" className="text-xs font-medium cursor-pointer">Revenue Amount</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="flag-receipt" checked={flaggedReceipt} onCheckedChange={(val) => setFlaggedReceipt(!!val)} />
                        <label htmlFor="flag-receipt" className="text-xs font-medium cursor-pointer">Receipt/Teller</label>
                      </div>
                    </div>
                  </div>

                  {/* Comments / Reason Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="review-reason" className={reviewStatus === "REJECTED" ? "text-rose-600" : ""}>
                      Review Reason/Remarks {reviewStatus === "REJECTED" && "*"}
                    </Label>
                    <Textarea
                      id="review-reason"
                      placeholder={reviewStatus === "REJECTED" ? "Specify why the report is rejected..." : "Optional remarks on the review..."}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  {apiError && <p className="text-xs text-rose-600">{apiError}</p>}

                  <DialogFooter showCloseButton={false} className="pt-2">
                    <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? (
                        <>
                          <SpinnerEllipsis />
                          <span>Saving review...</span>
                        </>
                      ) : (
                        reviewStatus === "APPROVED" ? "Approve & Complete" : "Reject Report"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>

            {selectedReport.status !== "PENDING" && (
              <DialogFooter className="shrink-0 pt-3 border-t">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

