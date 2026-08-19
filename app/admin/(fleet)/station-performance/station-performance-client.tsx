"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Fuel,
  TrendingUp,
  AlertTriangle,
  Droplets,
  Truck,
  ArrowRight,
  Calculator,
  Eye,
  Filter,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatSparkline } from "@/components/charts/stat-sparkline";

export type StationPerformanceItem = {
  id: string;
  code: string;
  name: string;
  location: string;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  tanksCount: number;
  totalCapacity: number;
  currentStock: number;
  fillPercentage: number;
  litersSold: number;
  totalRevenue: number;
  totalPaymentsReceived: number;
  litersOrdered: number;
  dailySalesVelocity: number;
  daysStockRemaining: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "ADEQUATE";
  recommendedAllocation: number;
};

interface SearchSelectOption {
  label: string;
  value: string;
}

function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | SearchSelectOption)[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const formattedOptions: SearchSelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const selectedOption = formattedOptions.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="--clear--"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-muted-foreground italic justify-center text-xs"
              >
                Clear selection
              </CommandItem>
              {formattedOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function StationPerformanceClient({
  initialStations,
}: {
  initialStations: StationPerformanceItem[];
}) {
  const [selectedStation, setSelectedStation] = useState<StationPerformanceItem | null>(null);
  
  // Distribution Truck Calculator modal state
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [truckCapacity, setTruckCapacity] = useState<number>(33000);

  // Filter drawer states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterOrg, setFilterOrg] = useState<string>("");

  const [draftPriority, setDraftPriority] = useState<string>(filterPriority);
  const [draftOrg, setDraftOrg] = useState<string>(filterOrg);

  // Options for Priority filter
  const priorityOptions = useMemo(
    () => [
      { label: "Resupply Urgent (Critical & High)", value: "RESUPPLY_NEEDED" },
      { label: "Critical Stock", value: "CRITICAL" },
      { label: "High Priority", value: "HIGH" },
      { label: "Medium Priority", value: "MEDIUM" },
      { label: "Adequate Stock", value: "ADEQUATE" },
    ],
    []
  );

  // Unique organization names for dropdown
  const uniqueOrganizations = useMemo(() => {
    return Array.from(new Set(initialStations.map((s) => s.organization.name).filter(Boolean)));
  }, [initialStations]);

  const applyFilters = () => {
    setFilterPriority(draftPriority);
    setFilterOrg(draftOrg);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftPriority("ALL");
    setDraftOrg("");
    setFilterPriority("ALL");
    setFilterOrg("");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = (filterPriority !== "ALL" && filterPriority !== "" ? 1 : 0) + (filterOrg !== "" ? 1 : 0);

  // Filter stations based on priority filter & org filter
  const filteredStations = useMemo(() => {
    return initialStations.filter((s) => {
      if (filterPriority === "RESUPPLY_NEEDED" && s.priority !== "CRITICAL" && s.priority !== "HIGH") return false;
      if (filterPriority && filterPriority !== "ALL" && filterPriority !== "RESUPPLY_NEEDED" && s.priority !== filterPriority) return false;
      if (filterOrg && s.organization.name !== filterOrg) return false;
      return true;
    });
  }, [initialStations, filterPriority, filterOrg]);

  // Summary Metrics
  const totalStations = initialStations.length;
  const totalStock = initialStations.reduce((sum, s) => sum + s.currentStock, 0);
  const totalCapacity = initialStations.reduce((sum, s) => sum + s.totalCapacity, 0);
  const totalSold = initialStations.reduce((sum, s) => sum + s.litersSold, 0);
  const totalRevenue = initialStations.reduce((sum, s) => sum + s.totalRevenue, 0);
  const resupplyUrgentCount = initialStations.filter(
    (s) => s.priority === "CRITICAL" || s.priority === "HIGH"
  ).length;

  const totalRecommendedResupply = initialStations.reduce((sum, s) => sum + s.recommendedAllocation, 0);

  // Per-station series used to render small meaningful sparklines inside each stat card
  const priorityCountSpark = useMemo(
    () =>
      (["CRITICAL", "HIGH", "MEDIUM", "ADEQUATE"] as const).map((p) => ({
        name: p,
        value: initialStations.filter((s) => s.priority === p).length,
      })),
    [initialStations]
  );
  const stockByStationSpark = useMemo(
    () => initialStations.map((s) => ({ name: s.code, value: s.fillPercentage })),
    [initialStations]
  );
  const soldByStationSpark = useMemo(
    () => initialStations.map((s) => ({ name: s.code, value: s.litersSold })),
    [initialStations]
  );
  const allocationByStationSpark = useMemo(
    () =>
      initialStations
        .filter((s) => s.recommendedAllocation > 0)
        .map((s) => ({ name: s.code, value: s.recommendedAllocation })),
    [initialStations]
  );

  const statCards = [
    {
      title: "MANAGED STATIONS",
      value: `${totalStations}`,
      fullValue: `${totalStations} active stations (${resupplyUrgentCount} needing stock resupply)`,
      icon: Building2,
      iconColor: "text-blue-500",
      sparkData: priorityCountSpark,
      sparkColor: "#3b82f6",
      sparkType: "bar" as const,
    },
    {
      title: "NETWORK STOCK LEVEL",
      value: `${totalStock.toLocaleString()} L`,
      fullValue: `${totalStock.toLocaleString()} L of ${totalCapacity.toLocaleString()} L combined capacity (${totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0}% filled)`,
      icon: Droplets,
      iconColor: "text-amber-500",
      sparkData: stockByStationSpark,
      sparkColor: "#f59e0b",
      sparkType: "line" as const,
    },
    {
      title: "TOTAL VOLUME SOLD",
      value: `${totalSold.toLocaleString()} L`,
      fullValue: `${totalSold.toLocaleString()} L sold • Total Revenue: ₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-500",
      sparkData: soldByStationSpark,
      sparkColor: "#10b981",
      sparkType: "line" as const,
    },
    {
      title: "TARGET ALLOCATION NEED",
      value: `${totalRecommendedResupply.toLocaleString()} L`,
      fullValue: `Recommended total resupply: ${totalRecommendedResupply.toLocaleString()} L to bring stations to 85% capacity`,
      icon: Fuel,
      iconColor: "text-purple-500",
      valueColor: "text-purple-500",
      sparkData: allocationByStationSpark,
      sparkColor: "#a855f7",
      sparkType: "bar" as const,
    },
  ];

  const columns = useMemo<ColumnDef<StationPerformanceItem>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Station & Org",
        cell: ({ row }) => {
          const station = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9 rounded-lg border border-border/40 shrink-0">
                {station.organization.logoUrl ? (
                  <AvatarImage src={station.organization.logoUrl} alt={station.organization.name} />
                ) : (
                  <AvatarFallback className="rounded-lg text-xs bg-primary/10 text-primary font-bold">
                    {station.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-foreground text-sm block">
                  {station.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {station.code} • {station.organization.name}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "stock",
        header: () => <div className="text-right whitespace-nowrap">Current Stock / Cap</div>,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="text-right font-mono text-xs">
              <span className="font-bold text-foreground">
                {s.currentStock.toLocaleString()} L
              </span>
              <span className="text-muted-foreground block text-[11px]">
                / {s.totalCapacity.toLocaleString()} L
              </span>
            </div>
          );
        },
      },
      {
        id: "fill",
        header: () => <div className="text-center whitespace-nowrap">Stock Fill</div>,
        cell: ({ row }) => {
          const s = row.original;
          const isCritical = s.priority === "CRITICAL";
          const isHigh = s.priority === "HIGH";

          return (
            <div className="w-28 mx-auto space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isCritical
                      ? "bg-red-500"
                      : isHigh
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${s.fillPercentage}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground block text-center">
                {s.fillPercentage}% Full
              </span>
            </div>
          );
        },
      },
      {
        id: "dailySalesVelocity",
        accessorKey: "dailySalesVelocity",
        header: () => <div className="text-right whitespace-nowrap">Daily Sales Rate</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-semibold text-foreground">
            {row.original.dailySalesVelocity > 0
              ? `${row.original.dailySalesVelocity.toLocaleString()} L/day`
              : "—"}
          </div>
        ),
      },
      {
        id: "litersSold",
        accessorKey: "litersSold",
        header: () => <div className="text-right whitespace-nowrap">Total Sold</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-bold text-foreground">
            {row.original.litersSold.toLocaleString()} L
          </div>
        ),
      },
      {
        id: "totalRevenue",
        accessorKey: "totalRevenue",
        header: () => <div className="text-right whitespace-nowrap">Total Revenue</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-bold text-emerald-500">
            ₦{row.original.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        id: "daysStockRemaining",
        accessorKey: "daysStockRemaining",
        header: () => <div className="text-center whitespace-nowrap">Stock Days Left</div>,
        cell: ({ row }) => {
          const s = row.original;
          const isCritical = s.priority === "CRITICAL";
          const isHigh = s.priority === "HIGH";

          return (
            <div className="text-center">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono",
                  isCritical
                    ? "bg-red-500/10 text-red-500"
                    : isHigh
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                {s.daysStockRemaining === 99 ? "Safe" : `${s.daysStockRemaining} days`}
              </span>
            </div>
          );
        },
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: () => <div className="text-center whitespace-nowrap">Priority</div>,
        cell: ({ row }) => {
          const p = row.original.priority;
          return (
            <div className="text-center">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  p === "CRITICAL"
                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                    : p === "HIGH"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : p === "MEDIUM"
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                )}
              >
                {p}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "recommendedAllocation",
        accessorKey: "recommendedAllocation",
        header: () => <div className="text-right whitespace-nowrap">Rec. Resupply</div>,
        cell: ({ row }) => {
          const rec = row.original.recommendedAllocation;
          return (
            <div className="text-right font-mono text-xs">
              {rec > 0 ? (
                <span className="font-bold text-primary">
                  +{rec.toLocaleString()} L
                </span>
              ) : (
                <span className="text-muted-foreground text-[11px]">Optimal</span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedStation(s)}
                title="View station details"
              >
                <Eye className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 text-xs gap-1 px-2.5 hover:border-primary hover:text-primary"
              >
                <Link href={`/admin/orders?stationId=${s.id}`}>
                  Allocate
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const filterNode = (
    <div className="flex items-center gap-2">
      <Sheet open={isFilterOpen} onOpenChange={(open) => {
        setIsFilterOpen(open);
        if (open) {
          setDraftPriority(filterPriority);
          setDraftOrg(filterOrg);
        }
      }}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 rounded-sm relative h-10">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Filter Records</SheetTitle>
            <SheetDescription>
              Apply filters to narrow down the table results.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
            <div className="space-y-3 w-full pt-2">
              <Label className="text-sm font-semibold">Resupply Priority</Label>
              <SearchSelect
                value={draftPriority === "ALL" ? "" : draftPriority}
                onChange={(val) => setDraftPriority(val || "ALL")}
                options={priorityOptions}
                placeholder="Select priority..."
              />
            </div>

            <div className="space-y-3 w-full pt-2">
              <Label className="text-sm font-semibold">Organization</Label>
              <SearchSelect
                value={draftOrg}
                onChange={setDraftOrg}
                options={uniqueOrganizations}
                placeholder="Select organization..."
              />
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

      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset
        </Button>
      )}
    </div>
  );

  const resupplyStations = [...initialStations]
    .filter((s) => s.recommendedAllocation > 0)
    .sort((a, b) => b.recommendedAllocation - a.recommendedAllocation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Station Performance & Fuel Allocation" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => setIsCalcOpen(true)}
          >
            <Calculator className="size-4 text-primary" />
            Allocation Calculator
          </Button>
          <Button asChild className="gap-2 text-xs">
            <Link href="/admin/orders">
              <Truck className="size-4" />
              Create Resupply Order
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((item, index) => (
          <TooltipProvider key={index} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border/40 shadow-xs cursor-default hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-lg font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                    <StatSparkline
                      data={item.sparkData}
                      dataKey="value"
                      type={item.sparkType}
                      color={item.sparkColor}
                      height={40}
                    />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                {item.fullValue}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Reusable Data Table Component */}
      <DataTable
        columns={columns}
        data={filteredStations}
        searchKey="name"
        searchPlaceholder="Filter by station or org..."
        filterNode={filterNode}
        pageSize={15}
        empty="No station performance records found."
      />

      {/* Station Detail Modal */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedStation && (
            <>
              <DialogHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-xl border border-border/40 shrink-0">
                    {selectedStation.organization.logoUrl ? (
                      <AvatarImage src={selectedStation.organization.logoUrl} alt={selectedStation.organization.name} />
                    ) : (
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                        {selectedStation.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg font-bold">{selectedStation.name}</DialogTitle>
                    <DialogDescription className="text-xs">
                      Code: <span className="font-mono">{selectedStation.code}</span> • {selectedStation.organization.name} ({selectedStation.location})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div
                  className={cn(
                    "p-3 rounded-lg border flex items-center justify-between",
                    selectedStation.priority === "CRITICAL"
                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                      : selectedStation.priority === "HIGH"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <div>
                      <p className="font-bold">Resupply Status: {selectedStation.priority}</p>
                      <p className="text-[11px] opacity-90">
                        {selectedStation.daysStockRemaining < 99
                          ? `Estimated stock exhaustion in ${selectedStation.daysStockRemaining} days based on sales momentum.`
                          : "Stock levels are healthy."}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-bold font-mono">
                    {selectedStation.fillPercentage}% Capacity
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Current Stock</span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {selectedStation.currentStock.toLocaleString()} L
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Tank Capacity</span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {selectedStation.totalCapacity.toLocaleString()} L
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Daily Sales Rate</span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {selectedStation.dailySalesVelocity.toLocaleString()} L/day
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Volume Sold</span>
                    <p className="font-mono font-bold text-foreground text-sm">
                      {selectedStation.litersSold.toLocaleString()} L
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Revenue</span>
                    <p className="font-mono font-bold text-emerald-500 text-sm">
                      ₦{selectedStation.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-1">
                    <span className="text-[10px] text-primary font-bold uppercase">Suggested Resupply</span>
                    <p className="font-mono font-bold text-primary text-sm">
                      +{selectedStation.recommendedAllocation.toLocaleString()} L
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setSelectedStation(null)}>
                  Close
                </Button>
                <Button size="sm" asChild className="gap-1">
                  <Link href={`/admin/orders?stationId=${selectedStation.id}`}>
                    <Truck className="size-3.5" />
                    Issue Resupply Dispatch
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Distribution Allocation Calculator Modal */}
      <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b border-border/40 pb-4">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              Tanker Distribution Calculator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate optimal volume distribution across stations for an incoming tanker shipment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Available Tanker Capacity (Liters):</label>
              <div className="flex gap-2">
                {[11000, 22000, 33000, 45000, 60000].map((cap) => (
                  <Button
                    key={cap}
                    variant={truckCapacity === cap ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-mono"
                    onClick={() => setTruckCapacity(cap)}
                  >
                    {cap.toLocaleString()} L
                  </Button>
                ))}
              </div>
            </div>

            <div className="border border-border/40 rounded-lg overflow-hidden">
              <div className="bg-muted/40 p-2.5 font-bold uppercase text-[10px] text-muted-foreground flex justify-between border-b border-border/40">
                <span>Station Target</span>
                <span>Calculated Allocation</span>
              </div>
              <div className="divide-y divide-border/30 max-h-60 overflow-y-auto">
                {resupplyStations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    All stations have sufficient stock levels.
                  </div>
                ) : (
                  resupplyStations.map((station) => {
                    const totalDeficit = resupplyStations.reduce((sum, s) => sum + s.recommendedAllocation, 0);
                    const share = totalDeficit > 0 ? station.recommendedAllocation / totalDeficit : 0;
                    const allocatedLiters = Math.round((truckCapacity * share) / 1000) * 1000;

                    return (
                      <div key={station.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{station.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Current Stock: {station.currentStock.toLocaleString()} L ({station.fillPercentage}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-primary text-sm">
                            {allocatedLiters.toLocaleString()} L
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            ({Math.round(share * 100)}% of shipment)
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setIsCalcOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
