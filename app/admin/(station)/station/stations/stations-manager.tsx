"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StationsTable, type StationRow } from "./table";
import { cn } from "@/lib/utils";
import { FleetStatGroupCard } from "@/app/admin/(fleet)/_components/overview/fleet-stat-group-card";
import {
  buildStationProductStatGroups,
  type StationProductStats,
} from "@/lib/station/station-product-stat-groups";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface StationSimple {
  id: string;
  name: string;
  code: string;
}

export interface StationStatsData {
  productStats: StationProductStats;
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
            productStats: json.data.productStats,
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

  const statsHint = `${stationScopeLabel} · ${periodLabel}`;
  const productStatGroups = buildStationProductStatGroups(stats.productStats, statsHint);

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

      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4",
            isLoadingStats && "opacity-75 transition-opacity"
          )}
        >
          {productStatGroups.map((group) => (
            <FleetStatGroupCard key={group.id} group={group} />
          ))}
        </div>
      </TooltipProvider>

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
