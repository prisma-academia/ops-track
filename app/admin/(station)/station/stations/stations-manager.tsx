"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Plus, CheckCircle2, X } from "lucide-react";
import {
  FuelStationIcon,
  CreditCardPosIcon,
  DeliveryTruck01Icon,
} from "@hugeicons/core-free-icons";

import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StationsTable, type StationRow } from "./table";
import { cn } from "@/lib/utils";

export interface StationSimple {
  id: string;
  name: string;
  code: string;
}

export interface StationStatsData {
  stockLevel: {
    totalLiters: number;
    totalCapacity: number;
    utilizationPct: number;
    byProduct: Record<string, number>;
    tankCount: number;
  };
  sales: {
    totalRevenue: number;
    totalLitersSold: number;
    transactionCount: number;
    percentageChange: number;
  };
  remainingAndSold: {
    totalWaybillVolume: number;
    remainingLiters: number;
    soldLiters: number;
    remainingPct: number;
    soldPct: number;
    activeBatches: number;
  };
}

interface StationsManagerProps {
  initialStations: StationSimple[];
  initialStats: StationStatsData;
  initialRows: StationRow[];
  initialMeta: any;
}

function fmtQty(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return "₦0";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StationsManager({
  initialStations,
  initialStats,
  initialRows,
  initialMeta,
}: StationsManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter state directly from URL search params
  const selectedStationId = searchParams.get("stationId") || "ALL";
  const periodPreset = searchParams.get("period") || "30days";
  const productType = searchParams.get("productType") || "ALL";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [stats, setStats] = React.useState<StationStatsData>(initialStats);
  const [isLoadingStats, setIsLoadingStats] = React.useState<boolean>(false);
  const isInitialMount = React.useRef(true);

  // Compute date range based on preset or custom dates
  const dateRange = React.useMemo(() => {
    if (periodPreset === "custom" && fromParam && toParam) {
      const from = new Date(fromParam);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    const now = new Date();
    let from = new Date();
    let to = new Date();
    to.setHours(23, 59, 59, 999);

    if (periodPreset === "today") {
      from.setHours(0, 0, 0, 0);
    } else if (periodPreset === "7days") {
      from = subDays(now, 7);
      from.setHours(0, 0, 0, 0);
    } else if (periodPreset === "thisMonth") {
      from = startOfMonth(now);
      to = endOfMonth(now);
    } else {
      // default 30days
      from = subDays(now, 30);
      from.setHours(0, 0, 0, 0);
    }
    return { from, to };
  }, [periodPreset, fromParam, toParam]);

  // Fetch updated stats when filter query params change
  const fetchStats = React.useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (selectedStationId && selectedStationId !== "ALL") {
        params.set("stationId", selectedStationId);
      }
      if (productType && productType !== "ALL") {
        params.set("productType", productType);
      }
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());

      const res = await fetch(`/api/tenant/stations/stats?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setStats({
            stockLevel: json.data.stockLevel,
            sales: json.data.sales,
            remainingAndSold: json.data.remainingAndSold,
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch station stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedStationId, productType, dateRange]);

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchStats();
  }, [fetchStats]);

  const hasActiveFilters =
    selectedStationId !== "ALL" ||
    periodPreset !== "30days" ||
    productType !== "ALL" ||
    searchParams.has("salesMin") ||
    searchParams.has("stockMin");

  const clearFilterParam = (paramName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    if (paramName === "period") {
      params.delete("from");
      params.delete("to");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(window.location.pathname);
  };

  const selectedStationObj = initialStations.find((s) => s.id === selectedStationId);
  const stationScopeLabel = selectedStationObj ? selectedStationObj.name : "All Stations";

  const periodLabel =
    periodPreset === "today"
      ? "Today"
      : periodPreset === "7days"
      ? "Last 7 Days"
      : periodPreset === "30days"
      ? "Last 30 Days"
      : periodPreset === "thisMonth"
      ? "This Month"
      : `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Stations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your retail outlet service stations, tanks, pumps, and real-time operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-9 gap-2 text-xs">
            <Link href="/admin/station/stations/new">
              <Plus className="h-4 w-4" />
              Add Station
            </Link>
          </Button>
        </div>
      </div>

      {/* 3 Dashboard-Style Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Stock Level */}
        <DashboardOverviewCardV3
          title="Stock Level"
          icon={FuelStationIcon}
          period={stationScopeLabel}
          className={cn(isLoadingStats && "opacity-75 transition-opacity")}
          data={{
            formattedValue: `${fmtQty(stats.stockLevel.totalLiters)} L`,
            subtitle: `PMS: ${fmtQty(stats.stockLevel.byProduct.PMS)} L • AGO: ${fmtQty(
              stats.stockLevel.byProduct.AGO
            )} L • LPG: ${fmtQty(stats.stockLevel.byProduct.LPG)} L`,
          }}
          action={
            <div className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {stats.stockLevel.tankCount} Tanks
            </div>
          }
        />

        {/* Card 2: Sales */}
        <DashboardOverviewCardV3
          title="Sales"
          icon={CreditCardPosIcon}
          period={periodLabel}
          className={cn(isLoadingStats && "opacity-75 transition-opacity")}
          data={{
            formattedValue: fmtMoney(stats.sales.totalRevenue),
            percentageChange: stats.sales.percentageChange,
            subtitle: `${fmtQty(stats.sales.totalLitersSold)} L sold • ${stats.sales.transactionCount} entries`,
          }}
          action={
            productType !== "ALL" ? (
              <div className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {productType}
              </div>
            ) : undefined
          }
        />

        {/* Card 3: Remaining and Sold */}
        <DashboardOverviewCardV3
          title="Remaining & Sold"
          icon={DeliveryTruck01Icon}
          period={`${stats.remainingAndSold.activeBatches} Waybill Allocations`}
          className={cn(isLoadingStats && "opacity-75 transition-opacity")}
          data={{
            formattedValue: `${fmtQty(stats.remainingAndSold.remainingLiters)} L Left`,
            subtitle: `Sold: ${fmtQty(stats.remainingAndSold.soldLiters)} L (${stats.remainingAndSold.soldPct.toFixed(1)}%) • Remaining: ${stats.remainingAndSold.remainingPct.toFixed(1)}%`,
          }}
          action={
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3" />
              <span>{stats.remainingAndSold.remainingPct.toFixed(0)}% Stock Level</span>
            </div>
          }
        />
      </div>

      {/* Active Filter Chips (if any filters applied from the table filter drawer) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground text-[11px] font-semibold">Active Filters:</span>
          {selectedStationId !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <span>Station: {stationScopeLabel}</span>
              <button
                type="button"
                onClick={() => clearFilterParam("stationId")}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {periodPreset !== "30days" && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <span>Period: {periodLabel}</span>
              <button
                type="button"
                onClick={() => clearFilterParam("period")}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {productType !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <span>Product: {productType}</span>
              <button
                type="button"
                onClick={() => clearFilterParam("productType")}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.has("salesMin") && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <span>Min Sales: ₦{searchParams.get("salesMin")}</span>
              <button
                type="button"
                onClick={() => clearFilterParam("salesMin")}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.has("stockMin") && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <span>Min Stock: {searchParams.get("stockMin")} L</span>
              <button
                type="button"
                onClick={() => clearFilterParam("stockMin")}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Stations Table (Contains the Filter button at the top of the table) */}
      <div className="space-y-4">
        <StationsTable
          initialData={initialRows}
          initialMeta={initialMeta}
          stations={initialStations}
        />
      </div>
    </div>
  );
}
