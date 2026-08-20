"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { AlertTriangle, Truck, Calculator, Eye } from "lucide-react";

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
import { DataTable, DataTableColumnHeader, TableInsightCards, buildPctStats } from "@/components/tables";
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
  expectedAmount: number;
  cashVariance: number;
  expensesAmount: number;
  contribution: number;
  todayLiters: number;
  todayAmount: number;
  salesDays: number;
  avgPricePerLiter: number;
  dailySalesVelocity: number;
  daysStockRemaining: number;
  lastSaleDate: string | null;
  lastSaleLiters: number;
  lastSaleAmount: number;
  daysSinceLastSale: number | null;
  soldByProduct: Record<string, number>;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "ADEQUATE";
  recommendedAllocation: number;
  performanceWindowDays: number;
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLastSale(iso: string | null, daysSince: number | null) {
  if (!iso) return "—";
  if (daysSince === 0) return "Today";
  if (daysSince === 1) return "Yesterday";
  if (daysSince != null && daysSince < 7) return `${daysSince}d ago`;
  return format(new Date(iso), "d MMM");
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border border-border/30 bg-muted/40 p-3">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <p className="font-mono text-sm font-bold text-foreground">{value}</p>
    </div>
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

  const windowDays = initialStations[0]?.performanceWindowDays ?? 30;

  const metrics = React.useMemo(() => {
    const totalStock = initialStations.reduce((sum, station) => sum + station.currentStock, 0);
    const totalSold = initialStations.reduce((sum, station) => sum + station.litersSold, 0);
    const totalRevenue = initialStations.reduce((sum, station) => sum + station.totalRevenue, 0);
    const totalDailyRate = initialStations.reduce((sum, station) => sum + station.dailySalesVelocity, 0);

    return { count: initialStations.length, totalStock, totalSold, totalRevenue, totalDailyRate };
  }, [initialStations]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "stations", label: "Managed Stations", value: metrics.count, color: "#3b82f6" },
        {
          key: "sold",
          label: `${windowDays}d Volume Sold`,
          value: metrics.totalSold,
          color: "#10b981",
          format: (n) => `${n.toLocaleString()} L`,
        },
        {
          key: "revenue",
          label: `${windowDays}d Amount Sold`,
          value: metrics.totalRevenue,
          color: "#f59e0b",
          format: (n) => formatMoney(n),
        },
        {
          key: "daily",
          label: "Network Daily Rate",
          value: metrics.totalDailyRate,
          color: "#a855f7",
          format: (n) => `${n.toLocaleString()} L/day`,
        },
      ]),
    [metrics, windowDays]
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
                {/* <span className="font-mono text-xs text-muted-foreground">{station.code}</span> */}
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
        accessorKey: "fillPercentage",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fill %" />,
        meta: { label: "Fill %" },
        cell: ({ row }) => {
          const station = row.original;
          return (
            <div className="w-28 space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    station.priority === "CRITICAL"
                      ? "bg-red-500"
                      : station.priority === "HIGH"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                  style={{ width: `${station.fillPercentage}%` }}
                />
              </div>
              <span className="block text-center text-[10px] font-semibold text-muted-foreground">
                {station.fillPercentage}%
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
            {formatMoney(row.original.totalRevenue)}
          </span>
        ),
        footer: ({ table }) =>
          formatMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.totalRevenue, 0)
          ),
      },
      {
        accessorKey: "daysStockRemaining",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Days Cover" />,
        meta: { label: "Days Cover" },
        cell: ({ row }) => {
          const station = row.original;
          if (station.dailySalesVelocity <= 0) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className={cn(
                "font-mono text-xs font-bold",
                station.daysStockRemaining < 3
                  ? "text-red-500"
                  : station.daysStockRemaining < 7
                    ? "text-amber-500"
                    : "text-foreground"
              )}
            >
              {station.daysStockRemaining}d
            </span>
          );
        },
      },
      {
        accessorKey: "lastSaleDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Sale" />,
        meta: { label: "Last Sale" },
        cell: ({ row }) => (
          <span className="text-xs">
            {formatLastSale(row.original.lastSaleDate, row.original.daysSinceLastSale)}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
        meta: { label: "Priority" },
        cell: ({ row }) => {
          const priority = row.original.priority;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                priority === "CRITICAL"
                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                  : priority === "HIGH"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    : priority === "MEDIUM"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              )}
            >
              {priority}
            </Badge>
          );
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedStation(row.original)}
              title="View station details"
            >
              <Eye className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const resupplyStations = [...initialStations]
    .filter((station) => station.recommendedAllocation > 0)
    .sort((a, b) => b.recommendedAllocation - a.recommendedAllocation);

  const productEntries = selectedStation
    ? Object.entries(selectedStation.soldByProduct).filter(([, liters]) => liters > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <PageHeader title="Station Performance & Fuel Allocation" />
          <p className="mt-1 text-xs text-muted-foreground">
            Pump sales, stock cover, and resupply need for the last {windowDays} days.
          </p>
        </div>
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

      <TableInsightCards stats={insightStats} breakdownTitle="Performance mix" />

      <DataTable
        columns={columns}
        data={initialStations}
        tableId="fleet-station-performance"
        searchPlaceholder="Filter by station or org..."
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
                      <AvatarImage
                        src={selectedStation.organization.logoUrl}
                        alt={selectedStation.organization.name}
                      />
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
                  <MetricCard
                    label="Current Stock"
                    value={`${selectedStation.currentStock.toLocaleString()} L`}
                  />
                  <MetricCard
                    label="Total Capacity"
                    value={`${selectedStation.totalCapacity.toLocaleString()} L`}
                  />
                  <MetricCard
                    label="Daily Sales Rate"
                    value={`${selectedStation.dailySalesVelocity.toLocaleString()} L/day`}
                  />
                  <MetricCard
                    label={`${windowDays}d Volume Sold`}
                    value={`${selectedStation.litersSold.toLocaleString()} L`}
                  />
                  <MetricCard label={`${windowDays}d Amount Sold`} value={formatMoney(selectedStation.totalRevenue)} />
                  <MetricCard
                    label="Avg Selling Price"
                    value={
                      selectedStation.avgPricePerLiter > 0
                        ? `${formatMoney(selectedStation.avgPricePerLiter)}/L`
                        : "—"
                    }
                  />
                  <MetricCard label="Today's Sales" value={`${selectedStation.todayLiters.toLocaleString()} L`} />
                  <MetricCard label="Today's Amount" value={formatMoney(selectedStation.todayAmount)} />
                  <MetricCard
                    label="Sales Days"
                    value={`${selectedStation.salesDays} / ${windowDays}`}
                  />
                  <MetricCard
                    label="Last Sale"
                    value={formatLastSale(selectedStation.lastSaleDate, selectedStation.daysSinceLastSale)}
                  />
                  <MetricCard label="Expected Amount" value={formatMoney(selectedStation.expectedAmount)} />
                  <MetricCard
                    label="Cash Variance"
                    value={formatMoney(selectedStation.cashVariance)}
                  />
                  <MetricCard label={`${windowDays}d Expenses`} value={formatMoney(selectedStation.expensesAmount)} />
                  <MetricCard label="Contribution" value={formatMoney(selectedStation.contribution)} />
                  <MetricCard
                    label="Suggested Resupply"
                    value={`+${selectedStation.recommendedAllocation.toLocaleString()} L`}
                  />
                </div>

                {productEntries.length > 0 ? (
                  <div className="rounded-lg border border-border/30 bg-muted/40 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">
                      {windowDays}d volume by product
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {productEntries.map(([product, liters]) => (
                        <Badge key={product} variant="outline" className="font-mono text-[11px]">
                          {product}: {liters.toLocaleString()} L
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="border-t border-border/40 pt-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedStation(null)}>
                  Close
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
                      (sum, item) => sum + item.recommendedAllocation,
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
