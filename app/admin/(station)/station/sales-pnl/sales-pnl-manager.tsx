"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Fuel,
  Receipt,
  Building2,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  Trophy,
  Medal,
  Award,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
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
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilterField,
} from "@/components/tables";
import { cn } from "@/lib/utils";

// --- Types ---
export interface Station {
  id: string;
  name: string;
  code: string;
}

export interface SalesLogRow {
  id: string;
  stationId: string;
  productType: string;
  litersSold: number | string;
  pricePerLiter: number | string;
  amountPos: number | string;
  amountTransfer: number | string;
  appliedCredit?: number | string;
  logDate: string;
  createdAt?: string;
  station: {
    id: string;
    name: string;
    code: string;
  };
}

export interface WaybillAllocationRow {
  id: string;
  stationId: string;
  costPerLiter: number | string | null;
  litersToDispense: number | string;
  litersReceived: number | string | null;
  transportationCost: number | string | null;
  deliveredAt: string;
  waybill: {
    productType: string;
    truckPlate: string;
  };
}

export interface ExpenseRow {
  id: string;
  stationId: string | null;
  category: string;
  paymentMethod: string;
  amount: number | string;
  description: string;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
  station?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface DayAuditRow {
  sn: number;
  rank: number;
  id: string;
  date: string;
  stationId: string;
  stationName: string;
  productType: string;
  litersSold: number;
  sellingPrice: number;
  costPrice: number;
  revenue: number;
  fuelCost: number;
  expenses: number;
  netProfit: number;
  marginPct: number;
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "₦0.00";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtLiters(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

const PRODUCT_COLORS: Record<string, string> = {
  PMS: "#3b82f6", // Blue
  AGO: "#10b981", // Emerald
  DPK: "#f59e0b", // Amber
  LPG: "#8b5cf6", // Purple
};

const pieChartConfig: ChartConfig = {
  cost: { label: "Fuel Cost (COGS)", color: "#3b82f6" },
  expense: { label: "Operating Expenses", color: "#f59e0b" },
  profit: { label: "Net Profit", color: "#10b981" },
  loss: { label: "Net Loss", color: "#ef4444" },
};

const barChartConfig: ChartConfig = {
  liters: { label: "Volume Sold (L)", color: "#3b82f6" },
};

export function SalesPnlManager({
  stations,
  salesLogs,
  allocations,
  expenses,
}: {
  stations: Station[];
  salesLogs: SalesLogRow[];
  allocations: WaybillAllocationRow[];
  expenses: ExpenseRow[];
}) {
  // Filter States
  const [selectedStationId, setSelectedStationId] = React.useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = React.useState<string>("ALL");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));

  // Benchmark / What-if cost override
  const [useBenchmarkCost, setUseBenchmarkCost] = React.useState(false);
  const [benchmarkCost, setBenchmarkCost] = React.useState<string>("950");

  // Expense Inspection Sheet
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = React.useState(false);

  // Pre-index allocations for fast cost resolution
  const sortedAllocations = React.useMemo(() => {
    return [...allocations].sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );
  }, [allocations]);

  const resolveCostPerLiter = React.useCallback(
    (stationId: string, productType: string, saleDate: Date, sellingPrice: number) => {
      if (useBenchmarkCost) {
        const parsed = parseFloat(benchmarkCost);
        return isNaN(parsed) ? 0 : parsed;
      }

      const saleTime = saleDate.getTime();

      // 1. Look for allocation on same station & product delivered on or before sale
      const match = sortedAllocations.find(
        (a) =>
          a.stationId === stationId &&
          a.waybill.productType === productType &&
          new Date(a.deliveredAt).getTime() <= saleTime &&
          Number(a.costPerLiter || 0) > 0
      );
      if (match) {
        const baseCost = Number(match.costPerLiter);
        const transportTotal = Number(match.transportationCost || 0);
        const qty = Number(match.litersReceived || match.litersToDispense || 1);
        const unitTransport = qty > 0 ? transportTotal / qty : 0;
        return baseCost + unitTransport;
      }

      // 2. Look for any allocation for same station & product
      const nearestMatch = sortedAllocations.find(
        (a) =>
          a.stationId === stationId &&
          a.waybill.productType === productType &&
          Number(a.costPerLiter || 0) > 0
      );
      if (nearestMatch) {
        return Number(nearestMatch.costPerLiter);
      }

      // 3. Fallback across all stations for that product
      const tenantMatch = sortedAllocations.find(
        (a) => a.waybill.productType === productType && Number(a.costPerLiter || 0) > 0
      );
      if (tenantMatch) {
        return Number(tenantMatch.costPerLiter);
      }

      // 4. Default estimation: standard 92% of selling price if no waybill data yet
      return sellingPrice > 0 ? sellingPrice * 0.92 : 0;
    },
    [sortedAllocations, useBenchmarkCost, benchmarkCost]
  );

  // Filter Sales Logs
  const filteredSales = React.useMemo(() => {
    return salesLogs.filter((log) => {
      if (selectedStationId !== "ALL" && log.stationId !== selectedStationId) {
        return false;
      }
      if (selectedProduct !== "ALL" && log.productType !== selectedProduct) {
        return false;
      }
      const logDate = new Date(log.logDate);
      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (logDate < fromDate) return false;
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return false;
      }
      return true;
    });
  }, [salesLogs, selectedStationId, selectedProduct, dateRange]);

  // Filter Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      if (selectedStationId !== "ALL" && e.stationId !== selectedStationId) {
        return false;
      }
      const expDate = new Date(e.createdAt);
      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (expDate < fromDate) return false;
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (expDate > toDate) return false;
      }
      return true;
    });
  }, [expenses, selectedStationId, dateRange]);

  // Core Financial Aggregations
  const {
    totalLiters,
    totalRevenue,
    totalCost,
    totalExpenses,
    netProfit,
    netMarginPct,
    marginPerLiter,
  } = React.useMemo(() => {
    let liters = 0;
    let rev = 0;
    let cost = 0;

    for (const log of filteredSales) {
      const vol = Number(log.litersSold || 0);
      const price = Number(log.pricePerLiter || 0);
      const logDate = new Date(log.logDate);
      const unitCost = resolveCostPerLiter(log.stationId, log.productType, logDate, price);

      liters += vol;
      rev += vol * price;
      cost += vol * unitCost;
    }

    const exp = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const gross = rev - cost;
    const net = gross - exp;
    const margin = rev > 0 ? (net / rev) * 100 : 0;
    const marginPerL = liters > 0 ? net / liters : 0;

    return {
      totalLiters: liters,
      totalRevenue: rev,
      totalCost: cost,
      totalExpenses: exp,
      grossProfit: gross,
      netProfit: net,
      netMarginPct: margin,
      marginPerLiter: marginPerL,
    };
  }, [filteredSales, filteredExpenses, resolveCostPerLiter]);

  // Product Sold Ranking Data (For Left Card Bar Chart & List)
  const productRankingData = React.useMemo(() => {
    const map = new Map<
      string,
      {
        product: string;
        liters: number;
        revenue: number;
        cost: number;
        color: string;
      }
    >();

    for (const log of filteredSales) {
      const p = log.productType;
      const vol = Number(log.litersSold || 0);
      const price = Number(log.pricePerLiter || 0);
      const unitCost = resolveCostPerLiter(
        log.stationId,
        log.productType,
        new Date(log.logDate),
        price
      );

      const entry = map.get(p) || {
        product: p,
        liters: 0,
        revenue: 0,
        cost: 0,
        color: PRODUCT_COLORS[p] || "#64748b",
      };

      entry.liters += vol;
      entry.revenue += vol * price;
      entry.cost += vol * unitCost;
      map.set(p, entry);
    }

    const list = Array.from(map.values()).sort((a, b) => b.liters - a.liters);
    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
      sharePct: totalLiters > 0 ? (item.liters / totalLiters) * 100 : 0,
    }));
  }, [filteredSales, resolveCostPerLiter, totalLiters]);

  // Day Audit Rows for DataTable (With Rank calculated by Net Profit)
  const dayAuditRows: DayAuditRow[] = React.useMemo(() => {
    const expensesByDayStation = new Map<string, number>();
    for (const exp of filteredExpenses) {
      if (!exp.stationId) continue;
      const key = `${format(new Date(exp.createdAt), "yyyy-MM-dd")}_${exp.stationId}`;
      expensesByDayStation.set(key, (expensesByDayStation.get(key) || 0) + Number(exp.amount || 0));
    }

    // Step 1: Build basic rows
    const unranked = filteredSales.map((log, index) => {
      const vol = Number(log.litersSold || 0);
      const soldPrice = Number(log.pricePerLiter || 0);
      const logDate = new Date(log.logDate);
      const costPrice = resolveCostPerLiter(log.stationId, log.productType, logDate, soldPrice);

      const rev = vol * soldPrice;
      const cost = vol * costPrice;
      const dayKey = `${format(logDate, "yyyy-MM-dd")}_${log.stationId}`;
      const dayExp = expensesByDayStation.get(dayKey) || 0;
      const net = rev - cost - dayExp;
      const margin = rev > 0 ? (net / rev) * 100 : 0;

      return {
        sn: index + 1,
        id: log.id,
        date: log.logDate,
        stationId: log.stationId,
        stationName: log.station?.name || "Station",
        productType: log.productType,
        litersSold: vol,
        sellingPrice: soldPrice,
        costPrice,
        revenue: rev,
        fuelCost: cost,
        expenses: dayExp,
        netProfit: net,
        marginPct: margin,
      };
    });

    // Step 2: Rank rows based on netProfit descending
    const sortedIndices = unranked
      .map((row, index) => ({ index, netProfit: row.netProfit }))
      .sort((a, b) => b.netProfit - a.netProfit);

    const rankMap = new Map<number, number>();
    sortedIndices.forEach((item, rankIdx) => {
      rankMap.set(item.index, rankIdx + 1);
    });

    return unranked.map((row, idx) => ({
      ...row,
      rank: rankMap.get(idx) || idx + 1,
    }));
  }, [filteredSales, filteredExpenses, resolveCostPerLiter]);

  // DataTable Columns with Ranking right after S/N
  const columns: ColumnDef<DayAuditRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "sn",
        header: ({ column }) => <DataTableColumnHeader column={column} title="S/N" />,
        meta: { label: "S/N" },
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sn}</span>,
      },
      {
        accessorKey: "rank",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rank" />,
        meta: { label: "Rank" },
        cell: ({ row }) => {
          const rank = row.original.rank;
          if (rank === 1) {
            return (
              <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs">
                <Trophy className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>#1</span>
              </span>
            );
          }
          if (rank === 2) {
            return (
              <span className="inline-flex items-center gap-1 font-bold text-slate-400 text-xs">
                <Medal className="w-3.5 h-3.5 fill-slate-300 text-slate-400" />
                <span>#2</span>
              </span>
            );
          }
          if (rank === 3) {
            return (
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-600 text-xs">
                <Award className="w-3.5 h-3.5 fill-amber-600 text-amber-700" />
                <span>#3</span>
              </span>
            );
          }
          return (
            <span className="font-mono text-xs text-muted-foreground font-medium pl-1">
              #{rank}
            </span>
          );
        },
      },
      {
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {format(new Date(row.original.date), "LLL dd, yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "stationName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.stationName}</span>,
      },
      {
        accessorKey: "productType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        meta: { label: "Product" },
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.productType}
          </Badge>
        ),
      },
      {
        accessorKey: "litersSold",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Sold" />,
        meta: { label: "Volume Sold" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtLiters(row.original.litersSold)}</span>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sold Price" />,
        meta: { label: "Sold Price" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs">₦{row.original.sellingPrice.toFixed(2)}/L</span>
        ),
      },
      {
        accessorKey: "costPrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Est. Cost" />,
        meta: { label: "Cost Price" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-muted-foreground">
            ₦{row.original.costPrice.toFixed(2)}/L
          </span>
        ),
      },
      {
        accessorKey: "revenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Gross Revenue" />,
        meta: { label: "Gross Revenue" },
        cell: ({ row }) => (
          <span className="font-mono font-medium tabular-nums">{fmtMoney(row.original.revenue)}</span>
        ),
      },
      {
        accessorKey: "fuelCost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fuel Cost (COGS)" />,
        meta: { label: "Fuel Cost" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtMoney(row.original.fuelCost)}
          </span>
        ),
      },
      {
        accessorKey: "expenses",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Day Expenses" />,
        meta: { label: "Expenses" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-amber-600 dark:text-amber-500">
            {fmtMoney(row.original.expenses)}
          </span>
        ),
      },
      {
        accessorKey: "netProfit",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Net Profit / Loss" />,
        meta: { label: "Net Profit" },
        cell: ({ row }) => {
          const isPos = row.original.netProfit >= 0;
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                isPos ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"
              )}
            >
              {fmtMoney(row.original.netProfit)}
            </span>
          );
        },
      },
      {
        accessorKey: "marginPct",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Margin %" />,
        meta: { label: "Margin %" },
        cell: ({ row }) => {
          const isPos = row.original.marginPct >= 0;
          return (
            <Badge variant={isPos ? "default" : "destructive"} className="text-xs">
              {isPos ? "+" : ""}
              {row.original.marginPct.toFixed(1)}%
            </Badge>
          );
        },
      },
    ],
    []
  );

  const filterFields: DataTableFilterField<DayAuditRow>[] = React.useMemo(
    () => [
      {
        id: "stationName",
        label: "Station",
        options: stations.map((s) => ({ label: s.name, value: s.name })),
      },
      {
        id: "productType",
        label: "Product",
        options: [
          { label: "PMS", value: "PMS" },
          { label: "AGO", value: "AGO" },
          { label: "DPK", value: "DPK" },
          { label: "LPG", value: "LPG" },
        ],
      },
    ],
    [stations]
  );

  // Grouped expenses by category for Sheet
  const expensesByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of filteredExpenses) {
      map.set(exp.category, (map.get(exp.category) || 0) + Number(exp.amount || 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sales & Profit Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time financial performance, product sales ranking, and net profit distribution.
          </p>
        </div>

        {/* Action button to open Expense Drawer directly */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpenseSheetOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Audit Expenses ({filteredExpenses.length})</span>
          </Button>
        </div>
      </div>

      {/* Clean Multi-Filter Bar without DateRange button clutter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border bg-card/60 shadow-xs">
        {/* Station Filter */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Station
          </Label>
          <Select value={selectedStationId} onValueChange={setSelectedStationId}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stations ({stations.length})</SelectItem>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Filter */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5" /> Fuel Product
          </Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Products</SelectItem>
              <SelectItem value="PMS">PMS (Petrol)</SelectItem>
              <SelectItem value="AGO">AGO (Diesel)</SelectItem>
              <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
              <SelectItem value="LPG">LPG (Gas)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe DateRangeFilter (Custom range with Last 7 days, Last 30 days, etc.) */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Timeframe
          </Label>
          <DateRangeFilter
            date={dateRange}
            setDate={setDateRange}
            tooltip={null}
            buttonClassName="h-9 w-full justify-between text-xs font-normal"
          />
        </div>

        {/* Costing Engine Mode Popover */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Purchase Price Logic
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between text-xs font-normal">
                <span>{useBenchmarkCost ? `Override: ₦${benchmarkCost}/L` : "Auto (Waybill Deliveries)"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-3" align="end">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Purchase Cost (COGS) Sourcing</p>
                <p className="text-[11px] text-muted-foreground">
                  By default, the cost is automatically derived from actual waybill delivery invoices for each station.
                </p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="benchmark-toggle" className="text-xs font-medium cursor-pointer">
                  Simulation Override
                </Label>
                <input
                  id="benchmark-toggle"
                  type="checkbox"
                  checked={useBenchmarkCost}
                  onChange={(e) => setUseBenchmarkCost(e.target.checked)}
                  className="rounded border-gray-300 text-primary"
                />
              </div>
              {useBenchmarkCost && (
                <div className="space-y-1 pt-1 border-t">
                  <Label className="text-[11px] text-muted-foreground">Fixed Purchase Cost (₦/L)</Label>
                  <Input
                    type="number"
                    value={benchmarkCost}
                    onChange={(e) => setBenchmarkCost(e.target.value)}
                    placeholder="e.g. 950"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* TWO STATS CARDS WITH CHARTS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* LEFT CARD: Product Sold Ranking (Bar Chart + Labels on the Right) */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-foreground block">Product Sold Ranking</span>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-medium">
                {productRankingData.length} Products Active
              </Badge>
            </div>

            {/* Split: Bar Chart on Left, Labels & Ranking on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center min-h-[220px]">
              {/* Bar Chart (Left) */}
              <div className="md:col-span-6 flex justify-center items-center">
                {productRankingData.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-10">No product sales in period</div>
                ) : (
                  <ChartContainer config={barChartConfig} className="h-48 w-full">
                    <BarChart
                      data={productRankingData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="product"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="#888888"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="#888888"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            formatter={(val, name, item) => [
                              `${Number(val).toLocaleString()} L (${fmtMoney(item.payload.revenue)})`,
                              item.payload.product,
                            ]}
                          />
                        }
                      />
                      <Bar dataKey="liters" radius={[6, 6, 0, 0]} barSize={26}>
                        {productRankingData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </div>

              {/* Labels with Indicators by the Right */}
              <div className="md:col-span-6 flex flex-col justify-center space-y-3 pl-0 md:pl-3 md:border-l">
                {productRankingData.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No data available</div>
                ) : (
                  productRankingData.map((p) => (
                    <div key={p.product} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground">{p.product}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{p.rank} ({p.sharePct.toFixed(1)}%)
                            </span>
                          </div>
                          <p className="font-mono font-semibold text-sm text-foreground block">
                            {fmtLiters(p.liters)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT CARD: Revenue Distribution & PnL (Pie Chart + Labels on the Right) */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-foreground block">Revenue Distribution & PnL</span>
              </div>
              <Badge
                variant={netProfit >= 0 ? "default" : "destructive"}
                className="text-xs font-bold px-2 py-0.5"
              >
                {netProfit >= 0 ? "+" : ""}
                {netMarginPct.toFixed(1)}% Margin
              </Badge>
            </div>

            {/* Split: Pie Chart on Left, Labels & Indicators on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center min-h-[220px]">
              {/* Doughnut / Pie Chart (Left) */}
              <div className="md:col-span-6 flex justify-center items-center">
                <ChartContainer
                  config={pieChartConfig}
                  className="h-48 w-full max-w-[200px] flex justify-center"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" hideLabel />}
                    />
                    <Pie
                      data={[
                        { name: "Fuel Cost (COGS)", value: totalCost, fill: "var(--color-cost)" },
                        { name: "Operating Expenses", value: totalExpenses, fill: "var(--color-expense)" },
                        ...(netProfit > 0
                          ? [{ name: "Net Profit", value: netProfit, fill: "var(--color-profit)" }]
                          : [{ name: "Net Loss", value: Math.abs(netProfit), fill: "var(--color-loss)" }]),
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={66}
                      paddingAngle={4}
                      stroke="none"
                      cornerRadius={4}
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Labels with Indicators by the Right */}
              <div className="md:col-span-6 flex flex-col justify-center space-y-3.5 pl-0 md:pl-3">
                {/* Gross Revenue */}
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none">
                      Gross Revenue
                    </p>
                    <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                      {fmtMoney(totalRevenue)}
                    </p>
                  </div>
                </div>

                {/* Fuel Cost (COGS) */}
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none">
                      Fuel Cost (COGS)
                    </p>
                    <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                      {fmtMoney(totalCost)}
                    </p>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div
                  className="flex items-start gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={() => setIsExpenseSheetOpen(true)}
                  title="Click to view itemized expenses"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none">
                        Operating Expenses
                      </p>
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                      {fmtMoney(totalExpenses)}
                    </p>
                  </div>
                </div>

                {/* Net Profit / Loss */}
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1 shrink-0",
                      netProfit >= 0 ? "bg-emerald-500" : "bg-destructive"
                    )}
                  />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none">
                      Net Profit / (Loss)
                    </p>
                    <p
                      className={cn(
                        "text-sm font-bold leading-tight mt-0.5",
                        netProfit >= 0
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-destructive"
                      )}
                    >
                      {fmtMoney(netProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED DAILY SALES & PNL LEDGER (With Rank column and clean toolbar) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Detailed Daily Sales & PnL Ledger</h2>
            <p className="text-xs text-muted-foreground">
              Day-by-day itemized record of sales, ranked by profitability, with computed fuel cost and operational margins.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={dayAuditRows}
          tableId="station-sales-pnl"
          filterFields={filterFields}
          searchPlaceholder="Search station, date..."
          emptyMessage="No sales records found matching the active filters."
          hideDateFilter
        />
      </div>

      {/* Slide-over Drawer: Itemized Expense Breakdown */}
      <Sheet open={isExpenseSheetOpen} onOpenChange={setIsExpenseSheetOpen}>
        <SheetContent side="right" className="flex w-[420px] flex-col sm:w-[560px]">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              <span>Station Operating Expenses</span>
            </SheetTitle>
            <SheetDescription>
              Itemized audit of cash & bank outflows incurred during the selected period.
            </SheetDescription>
          </SheetHeader>

          {/* Category Summary Chips */}
          <div className="p-4 border-b bg-muted/30 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-muted-foreground">Total Incurred:</span>
              <span className="font-bold text-amber-600 dark:text-amber-500 text-sm">
                {fmtMoney(totalExpenses)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {expensesByCategory.map(([cat, amt]) => (
                <Badge key={cat} variant="secondary" className="text-[11px] font-normal py-0.5">
                  <span className="font-medium mr-1">{cat.replace(/_/g, " ")}:</span>
                  <span className="font-mono font-semibold">{fmtMoney(amt)}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* List of individual expense vouchers */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No expense receipts recorded in this timeframe.
              </div>
            ) : (
              filteredExpenses.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border bg-card shadow-2xs space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{e.description || "Station Expense"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.station?.name || "Station"} • {format(new Date(e.createdAt), "LLL dd, yyyy")}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-500 text-sm">
                      {fmtMoney(Number(e.amount))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {e.category.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="uppercase">{e.paymentMethod}</span>
                      {e.receiptUrl && (
                        <a
                          href={e.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5 font-medium"
                        >
                          Receipt <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
