"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Truck,
  ArrowRight,
  Calculator,
  Eye,
  Filter,
  Check,
  ChevronsUpDown,
} from "lucide-react";

import { PageHeader } from "@/components/shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
  type DataTableFilterField,
} from "@/components/tables";
import { cn } from "@/lib/utils";

export type StationPerformanceItem = {
  id: string;
  code: string;
  name: string;
  location: string;
  organization: { id: string; name: string; logoUrl: string | null };
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

function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { label: string; value: string })[];
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const formattedOptions = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );
  const selectedOption = formattedOptions.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal">
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
                className="justify-center text-xs italic text-muted-foreground"
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
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
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
  const [selectedStation, setSelectedStation] = React.useState<StationPerformanceItem | null>(null);
  const [isCalcOpen, setIsCalcOpen] = React.useState(false);
  const [truckCapacity, setTruckCapacity] = React.useState(33000);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterPriority, setFilterPriority] = React.useState("ALL");
  const [filterOrg, setFilterOrg] = React.useState("");
  const [draftPriority, setDraftPriority] = React.useState(filterPriority);
  const [draftOrg, setDraftOrg] = React.useState(filterOrg);

  const priorityOptions = [
    { label: "Resupply Urgent (Critical & High)", value: "RESUPPLY_NEEDED" },
    { label: "Critical Stock", value: "CRITICAL" },
    { label: "High Priority", value: "HIGH" },
    { label: "Medium Priority", value: "MEDIUM" },
    { label: "Adequate Stock", value: "ADEQUATE" },
  ];

  const uniqueOrganizations = React.useMemo(
    () => Array.from(new Set(initialStations.map((s) => s.organization.name).filter(Boolean))),
    [initialStations]
  );

  const filteredStations = React.useMemo(() => {
    return initialStations.filter((s) => {
      if (filterPriority === "RESUPPLY_NEEDED" && s.priority !== "CRITICAL" && s.priority !== "HIGH")
        return false;
      if (
        filterPriority &&
        filterPriority !== "ALL" &&
        filterPriority !== "RESUPPLY_NEEDED" &&
        s.priority !== filterPriority
      )
        return false;
      if (filterOrg && s.organization.name !== filterOrg) return false;
      return true;
    });
  }, [initialStations, filterPriority, filterOrg]);

  const metrics = React.useMemo(() => {
    const totalStock = filteredStations.reduce((sum, s) => sum + s.currentStock, 0);
    const totalCapacity = filteredStations.reduce((sum, s) => sum + s.totalCapacity, 0);
    const totalSold = filteredStations.reduce((sum, s) => sum + s.litersSold, 0);
    const totalRevenue = filteredStations.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalRecommended = filteredStations.reduce((sum, s) => sum + s.recommendedAllocation, 0);
    const critical = filteredStations.filter((s) => s.priority === "CRITICAL").length;
    const high = filteredStations.filter((s) => s.priority === "HIGH").length;

    return {
      count: filteredStations.length,
      totalStock,
      totalCapacity,
      totalSold,
      totalRevenue,
      totalRecommended,
      critical,
      high,
    };
  }, [filteredStations]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "stations", label: "Managed Stations", value: metrics.count, color: "#3b82f6" },
        {
          key: "stock",
          label: "Network Stock",
          value: metrics.totalStock,
          color: "#f59e0b",
          format: (n) => `${n.toLocaleString()} L`,
        },
        {
          key: "sold",
          label: "Volume Sold",
          value: metrics.totalSold,
          color: "#10b981",
          format: (n) => `${n.toLocaleString()} L`,
        },
        {
          key: "allocation",
          label: "Target Allocation",
          value: metrics.totalRecommended,
          color: "#a855f7",
          format: (n) => `${n.toLocaleString()} L`,
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<StationPerformanceItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => {
          const station = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0 rounded-lg border border-border/40">
                {station.organization.logoUrl ? (
                  <AvatarImage src={station.organization.logoUrl} alt={station.organization.name} />
                ) : (
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {station.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="block text-sm font-semibold">{station.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{station.code}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "organization",
        accessorFn: (row) => row.organization.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
        meta: { label: "Organization" },
        cell: ({ row }) => <span className="text-sm">{row.original.organization.name}</span>,
      },
      {
        accessorKey: "currentStock",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Current Stock" />,
        meta: { label: "Current Stock" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">
            {row.original.currentStock.toLocaleString()} L
          </span>
        ),
        footer: ({ table }) =>
          `${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.currentStock, 0)
            .toLocaleString()} L`,
      },
      {
        accessorKey: "totalCapacity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Capacity" />,
        meta: { label: "Capacity" },
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.totalCapacity.toLocaleString()} L
          </span>
        ),
        footer: ({ table }) =>
          `${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.totalCapacity, 0)
            .toLocaleString()} L`,
      },
      {
        accessorKey: "fillPercentage",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fill %" />,
        meta: { label: "Fill %" },
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="w-28 space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    s.priority === "CRITICAL"
                      ? "bg-red-500"
                      : s.priority === "HIGH"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                  style={{ width: `${s.fillPercentage}%` }}
                />
              </div>
              <span className="block text-center text-[10px] font-semibold text-muted-foreground">
                {s.fillPercentage}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "dailySalesVelocity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Daily Rate" />,
        meta: { label: "Daily Rate" },
        cell: ({ row }) =>
          row.original.dailySalesVelocity > 0
            ? `${row.original.dailySalesVelocity.toLocaleString()} L/day`
            : "—",
      },
      {
        accessorKey: "litersSold",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Sold" />,
        meta: { label: "Volume Sold" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">{row.original.litersSold.toLocaleString()} L</span>
        ),
        footer: ({ table }) =>
          `${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.litersSold, 0)
            .toLocaleString()} L`,
      },
      {
        accessorKey: "totalRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount Sold" />,
        meta: { label: "Amount Sold" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-emerald-500">
            ₦{row.original.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        ),
        footer: ({ table }) =>
          `₦${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.totalRevenue, 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
      {
        accessorKey: "priority",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        meta: { label: "Priority" },
        cell: ({ row }) => {
          const p = row.original.priority;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                p === "CRITICAL"
                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                  : p === "HIGH"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    : p === "MEDIUM"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              )}
            >
              {p}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "recommendedAllocation",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rec. Resupply" />,
        meta: { label: "Rec. Resupply" },
        cell: ({ row }) =>
          row.original.recommendedAllocation > 0 ? (
            <span className="font-mono text-xs font-bold text-primary">
              +{row.original.recommendedAllocation.toLocaleString()} L
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Optimal</span>
          ),
        footer: ({ table }) =>
          `${table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.recommendedAllocation, 0)
            .toLocaleString()} L`,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedStation(s)}
                title="View station details"
              >
                <Eye className="size-4" />
              </Button>
              <Button variant="outline" size="sm" asChild className="h-7 gap-1 px-2.5 text-xs">
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

  const filterFields = React.useMemo<DataTableFilterField<StationPerformanceItem>[]>(
    () => [
      {
        id: "priority",
        label: "Priority",
        options: [
          { label: "Critical", value: "CRITICAL" },
          { label: "High", value: "HIGH" },
          { label: "Medium", value: "MEDIUM" },
          { label: "Adequate", value: "ADEQUATE" },
        ],
      },
    ],
    []
  );

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

  const activeFiltersCount =
    (filterPriority !== "ALL" && filterPriority !== "" ? 1 : 0) + (filterOrg !== "" ? 1 : 0);

  const filterSheet = (
    <Sheet
      open={isFilterOpen}
      onOpenChange={(open) => {
        setIsFilterOpen(open);
        if (open) {
          setDraftPriority(filterPriority);
          setDraftOrg(filterOrg);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 h-9">
          <Filter className="h-4 w-4" />
          Filter
          {activeFiltersCount > 0 ? (
            <Badge className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]">
              {activeFiltersCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[400px] flex-col sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filter Records</SheetTitle>
          <SheetDescription>Apply filters to narrow down the table results.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
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
  );

  const resupplyStations = [...initialStations]
    .filter((s) => s.recommendedAllocation > 0)
    .sort((a, b) => b.recommendedAllocation - a.recommendedAllocation);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title="Station Performance & Fuel Allocation" />
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 text-xs" onClick={() => setIsCalcOpen(true)}>
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

      <TableInsightCards stats={insightStats} breakdownTitle="Priority mix" />

      <DataTable
        columns={columns}
        data={filteredStations}
        tableId="fleet-station-performance"
        filterFields={filterFields}
        searchPlaceholder="Filter by station or org..."
        toolbarActions={filterSheet}
        pageSize={15}
        emptyMessage="No station performance records found."
      />

      <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedStation ? (
            <>
              <DialogHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 shrink-0 rounded-xl border border-border/40">
                    {selectedStation.organization.logoUrl ? (
                      <AvatarImage src={selectedStation.organization.logoUrl} alt={selectedStation.organization.name} />
                    ) : (
                      <AvatarFallback className="rounded-xl bg-primary/10 font-bold text-primary">
                        {selectedStation.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg font-bold">{selectedStation.name}</DialogTitle>
                    <DialogDescription className="text-xs">
                      Code: <span className="font-mono">{selectedStation.code}</span> ·{" "}
                      {selectedStation.organization.name} ({selectedStation.location})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    selectedStation.priority === "CRITICAL"
                      ? "border-red-500/30 bg-red-500/10 text-red-500"
                      : selectedStation.priority === "HIGH"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <div>
                      <p className="font-bold">Resupply Status: {selectedStation.priority}</p>
                      <p className="text-[11px] opacity-90">
                        {selectedStation.daysStockRemaining < 99
                          ? `Estimated stock exhaustion in ${selectedStation.daysStockRemaining} days.`
                          : "Stock levels are healthy."}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono font-bold">
                    {selectedStation.fillPercentage}% Capacity
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ["Current Stock", `${selectedStation.currentStock.toLocaleString()} L`],
                    ["Total Capacity", `${selectedStation.totalCapacity.toLocaleString()} L`],
                    ["Daily Sales Rate", `${selectedStation.dailySalesVelocity.toLocaleString()} L/day`],
                    ["Total Volume Sold", `${selectedStation.litersSold.toLocaleString()} L`],
                    [
                      "Total Revenue",
                      `₦${selectedStation.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    ],
                    ["Suggested Resupply", `+${selectedStation.recommendedAllocation.toLocaleString()} L`],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-1 rounded-lg border border-border/30 bg-muted/40 p-3">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
                      <p className="font-mono text-sm font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="border-t border-border/40 pt-3">
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
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b border-border/40 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
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
              <div className="flex flex-wrap gap-2">
                {[11000, 22000, 33000, 45000, 60000].map((cap) => (
                  <Button
                    key={cap}
                    variant={truckCapacity === cap ? "default" : "outline"}
                    size="sm"
                    className="h-8 font-mono text-xs"
                    onClick={() => setTruckCapacity(cap)}
                  >
                    {cap.toLocaleString()} L
                  </Button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/40">
              <div className="flex justify-between border-b border-border/40 bg-muted/40 p-2.5 text-[10px] font-bold uppercase text-muted-foreground">
                <span>Station Target</span>
                <span>Calculated Allocation</span>
              </div>
              <div className="max-h-60 divide-y divide-border/30 overflow-y-auto">
                {resupplyStations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    All stations have sufficient stock levels.
                  </div>
                ) : (
                  resupplyStations.map((station) => {
                    const totalDeficit = resupplyStations.reduce(
                      (sum, s) => sum + s.recommendedAllocation,
                      0
                    );
                    const share = totalDeficit > 0 ? station.recommendedAllocation / totalDeficit : 0;
                    const allocatedLiters = Math.round((truckCapacity * share) / 1000) * 1000;
                    return (
                      <div key={station.id} className="flex items-center justify-between p-2.5">
                        <div>
                          <p className="font-semibold text-foreground">{station.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Current Stock: {station.currentStock.toLocaleString()} L ({station.fillPercentage}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-primary">
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
          <DialogFooter className="border-t border-border/40 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsCalcOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
