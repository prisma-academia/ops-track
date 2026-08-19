"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
  type DataTableFilterField,
} from "@/components/tables";
import { cn, formatHumanReadableDate } from "@/lib/utils";

interface SalesReportRow {
  id: string;
  stationId: string;
  productType: string;
  pricePerLiter: number;
  openingDip: number;
  closingDip: number;
  litersSold: number;
  amountPos: number;
  amountTransfer: number;
  logDate: string | Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  station: { id: string; name: string; code: string };
  stationManagerName?: string;
  isDebtRepayment?: boolean;
  parentSaleId?: string | null;
}

type GroupedSale = SalesReportRow & {
  childRepayments: SalesReportRow[];
  overallBalance: number;
  totalReceived: number;
  expectedRevenue: number;
};

const statusVariant: Record<SalesReportRow["status"], "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesReportsManager({
  initialReports,
  stations,
}: {
  initialReports: SalesReportRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);
  const [draftStatus, setDraftStatus] = React.useState<string>("ALL");
  const [draftProduct, setDraftProduct] = React.useState<string>("ALL");
  const [draftDebtOperator, setDraftDebtOperator] = React.useState<string>("ALL");
  const [draftDebtAmount, setDraftDebtAmount] = React.useState<string>("");

  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<string>("ALL");
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");
  const [appliedDebtOperator, setAppliedDebtOperator] = React.useState<string>("ALL");
  const [appliedDebtAmount, setAppliedDebtAmount] = React.useState<string>("");

  const applyFilters = React.useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedStatus(draftStatus);
    setAppliedProduct(draftProduct);
    setAppliedDebtOperator(draftDebtOperator);
    setAppliedDebtAmount(draftDebtAmount);
    setIsOpen(false);
  }, [
    draftDateRange,
    draftStationIds,
    draftStatus,
    draftProduct,
    draftDebtOperator,
    draftDebtAmount,
  ]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftStatus("ALL");
    setDraftProduct("ALL");
    setDraftDebtOperator("ALL");
    setDraftDebtAmount("");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedStatus("ALL");
    setAppliedProduct("ALL");
    setAppliedDebtOperator("ALL");
    setAppliedDebtAmount("");
    setIsOpen(false);
  }, []);

  const groupedSales = React.useMemo<GroupedSale[]>(() => {
    const baseFiltered = initialReports.filter((report) => {
      if (report.isDebtRepayment) return false;
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(report.stationId)) return false;
      if (appliedStatus !== "ALL" && report.status !== appliedStatus) return false;
      if (appliedProduct !== "ALL" && report.productType !== appliedProduct) return false;

      const logDate = new Date(report.logDate);
      if (appliedDateRange?.from) {
        const sDate = new Date(appliedDateRange.from);
        sDate.setHours(0, 0, 0, 0);
        if (logDate < sDate) return false;
      }
      if (appliedDateRange?.to) {
        const eDate = new Date(appliedDateRange.to);
        eDate.setHours(23, 59, 59, 999);
        if (logDate > eDate) return false;
      }
      return !report.parentSaleId;
    });

    const children = initialReports.filter((r) => r.isDebtRepayment && r.parentSaleId);

    const grouped = baseFiltered.map((p) => {
      const childRepayments = children
        .filter((c) => c.parentSaleId === p.id)
        .sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());

      const expectedRevenue = Number(p.litersSold) * Number(p.pricePerLiter);
      const parentReceived = Number(p.amountPos) + Number(p.amountTransfer);
      const childRepaidTotal = childRepayments.reduce(
        (sum, c) => sum + Number(c.amountPos) + Number(c.amountTransfer),
        0
      );
      const totalReceived = parentReceived + childRepaidTotal;

      return {
        ...p,
        childRepayments,
        expectedRevenue,
        totalReceived,
        overallBalance: totalReceived - expectedRevenue,
      };
    });

    const sorted = grouped.sort(
      (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
    );

    if (appliedDebtOperator === "ALL" || appliedDebtAmount === "") return sorted;

    const targetAmount = Number(appliedDebtAmount);
    if (isNaN(targetAmount)) return sorted;

    return sorted.filter((g) => {
      if (appliedDebtOperator === "LESS_THAN_OR_EQUAL") return g.overallBalance <= targetAmount;
      if (appliedDebtOperator === "GREATER_THAN_OR_EQUAL") return g.overallBalance >= targetAmount;
      if (appliedDebtOperator === "EXACT") return g.overallBalance === targetAmount;
      return true;
    });
  }, [
    initialReports,
    appliedDateRange,
    appliedStationIds,
    appliedStatus,
    appliedProduct,
    appliedDebtOperator,
    appliedDebtAmount,
  ]);

  const metrics = React.useMemo(() => {
    let totalLiters = 0;
    let expectedRevenue = 0;
    let totalReceived = 0;
    let overpayment = 0;
    let underpayment = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    groupedSales.forEach((g) => {
      totalLiters += Number(g.litersSold);
      expectedRevenue += g.expectedRevenue;
      totalReceived += g.totalReceived;
      if (g.overallBalance > 0) overpayment += g.overallBalance;
      if (g.overallBalance < 0) underpayment += Math.abs(g.overallBalance);
      if (g.status === "APPROVED") approved += 1;
      if (g.status === "PENDING") pending += 1;
      if (g.status === "REJECTED") rejected += 1;
    });

    return {
      totalLiters,
      expectedRevenue,
      totalReceived,
      overpayment,
      underpayment,
      approved,
      pending,
      rejected,
      count: groupedSales.length,
    };
  }, [groupedSales]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "volume",
          label: "Volume Sold",
          value: metrics.totalLiters,
          color: "#3b82f6",
          format: (n) => `${n.toLocaleString()} L`,
        },
        {
          key: "revenue",
          label: "Digital Revenue",
          value: metrics.totalReceived,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
        {
          key: "approved",
          label: "Approved",
          value: metrics.approved,
          color: "#10b981",
        },
        {
          key: "pending",
          label: "Pending",
          value: metrics.pending,
          color: "#d97706",
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<GroupedSale>[]>(
    () => [
      {
        accessorKey: "logDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatHumanReadableDate(row.original.logDate)}
          </span>
        ),
      },
      {
        id: "station",
        accessorFn: (row) => row.station?.name ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-medium">{row.original.station?.name}</span>,
      },
      {
        id: "stationManagerName",
        accessorFn: (row) => row.stationManagerName ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station Manager" />,
        meta: { label: "Station Manager" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.stationManagerName || "—"}</span>
        ),
      },
      {
        accessorKey: "productType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        meta: { label: "Product" },
        cell: ({ row }) => <Badge variant="outline">{row.original.productType}</Badge>,
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "pricePerLiter",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Price/L" />,
        meta: { label: "Price/L" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            ₦{Number(row.original.pricePerLiter || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "litersSold",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume (L)" />,
        meta: { label: "Volume (L)" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{Number(row.original.litersSold).toLocaleString()} L</span>
        ),
        footer: ({ table }) =>
          `${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.litersSold), 0)
            .toLocaleString()} L`,
      },
      {
        id: "expectedRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Amount" />,
        meta: { label: "Expected Amount" },
        accessorFn: (row) => row.expectedRevenue,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtMoney(row.original.expectedRevenue)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.expectedRevenue, 0)
          ),
      },
      {
        id: "totalReceived",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount Received" />,
        meta: { label: "Amount Received" },
        accessorFn: (row) => row.totalReceived,
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">
            {fmtMoney(row.original.totalReceived)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.totalReceived, 0)
          ),
      },
      {
        id: "overallBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
        meta: { label: "Balance" },
        accessorFn: (row) => row.overallBalance,
        cell: ({ row }) => {
          const balance = row.original.overallBalance;
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                balance > 0 ? "text-emerald-600" : balance < 0 ? "text-rose-600" : "text-muted-foreground"
              )}
            >
              {balance === 0 ? "Settled" : `${balance > 0 ? "+" : "-"}${fmtMoney(Math.abs(balance))}`}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<GroupedSale>[]>(
    () => [
      {
        id: "status",
        label: "Status",
        options: [
          { label: "Approved", value: "APPROVED" },
          { label: "Pending", value: "PENDING" },
          { label: "Rejected", value: "REJECTED" },
        ],
      },
      {
        id: "productType",
        label: "Product",
        options: ["PMS", "AGO", "DPK", "LPG"].map((p) => ({ label: p, value: p })),
      },
    ],
    []
  );

  const filterSheet = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 h-9">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[400px] flex-col sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filter Records</SheetTitle>
          <SheetDescription>Apply filters to narrow down the table results.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          <div className="space-y-1 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Station</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    draftStationIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {draftStationIds.length === 0
                    ? "All Stations"
                    : `${draftStationIds.length} station(s)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="station-all"
                      checked={draftStationIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setDraftStationIds([]);
                      }}
                    />
                    <label htmlFor="station-all" className="text-sm font-medium leading-none cursor-pointer">
                      All Stations
                    </label>
                  </div>
                  {stations.map((s) => (
                    <div key={s.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={`station-${s.id}`}
                        checked={draftStationIds.includes(s.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDraftStationIds([...draftStationIds, s.id]);
                          } else {
                            setDraftStationIds(draftStationIds.filter((id) => id !== s.id));
                          }
                        }}
                      />
                      <label htmlFor={`station-${s.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {s.name}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3 w-full">
            <Label className="text-sm font-semibold">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={draftDateRange?.from ? format(draftDateRange.from, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setDraftDateRange((prev) => ({
                      from: e.target.value ? new Date(e.target.value) : undefined,
                      to: prev?.to,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={draftDateRange?.to ? format(draftDateRange.to, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setDraftDateRange((prev) => ({
                      from: prev?.from,
                      to: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Status</Label>
            <Select value={draftStatus} onValueChange={setDraftStatus}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Product</Label>
            <Select value={draftProduct} onValueChange={setDraftProduct}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Products</SelectItem>
                <SelectItem value="PMS">PMS</SelectItem>
                <SelectItem value="AGO">AGO</SelectItem>
                <SelectItem value="DPK">DPK</SelectItem>
                <SelectItem value="LPG">LPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 w-full">
            <Label className="text-sm font-semibold">Balance</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Condition</Label>
                <Select value={draftDebtOperator} onValueChange={setDraftDebtOperator}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="LESS_THAN_OR_EQUAL">Less than or equal (&lt;=)</SelectItem>
                    <SelectItem value="GREATER_THAN_OR_EQUAL">Greater than or equal (&gt;=)</SelectItem>
                    <SelectItem value="EXACT">Exact match (==)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <FormattedNumberInput
                  placeholder="e.g. 0"
                  value={draftDebtAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftDebtAmount(e.target.value)}
                  disabled={draftDebtOperator === "ALL"}
                  prefixText="₦"
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Reset Filters
          </Button>
          <Button onClick={applyFilters} className="w-full">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sales Reports</h1>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={groupedSales}
        tableId="station-sales-reports"
        filterFields={filterFields}
        searchPlaceholder="Search station, product..."
        toolbarActions={filterSheet}
        rowHref={(row) => `/admin/station/sales-reports/${row.id}`}
        emptyMessage="No sales reports found for the selected filters."
      />
    </div>
  );
}
