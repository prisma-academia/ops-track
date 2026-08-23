"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export type StockMovementRow = {
  id: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  tankId: string;
  tankName: string;
  productType: string;
  movementType:
    | "OPENING_BALANCE"
    | "DELIVERY"
    | "SALE"
    | "ADJUSTMENT"
    | "TRANSFER"
    | "RETURN"
    | "LOSS";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  variance: number;
  notes: string | null;
  referenceType: string | null;
  recordedByName: string;
  recordedAt: string;
};

type Station = { id: string; name: string; code: string };
type TankOption = { id: string; name: string; stationId: string; stationName: string; productType: string };

const MOVEMENT_TYPES: StockMovementRow["movementType"][] = [
  "OPENING_BALANCE",
  "DELIVERY",
  "SALE",
  "ADJUSTMENT",
  "TRANSFER",
  "RETURN",
  "LOSS",
];

const movementLabels: Record<StockMovementRow["movementType"], string> = {
  OPENING_BALANCE: "Opening Balance",
  DELIVERY: "Delivery",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
  RETURN: "Return",
  LOSS: "Loss",
};

function movementBadgeClass(type: StockMovementRow["movementType"]) {
  if (type === "DELIVERY" || type === "OPENING_BALANCE" || type === "RETURN") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  }
  if (type === "SALE" || type === "LOSS") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  }
  if (type === "ADJUSTMENT" || type === "TRANSFER") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }
  return "";
}

function fmtLiters(n: number) {
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

export function StockMovementsManager({
  initialRows,
  stations,
  tanks,
}: {
  initialRows: StockMovementRow[];
  stations: Station[];
  tanks: TankOption[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);
  const [draftTankIds, setDraftTankIds] = React.useState<string[]>([]);
  const [draftProduct, setDraftProduct] = React.useState<string>("ALL");
  const [draftType, setDraftType] = React.useState<string>("ALL");

  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedTankIds, setAppliedTankIds] = React.useState<string[]>([]);
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");
  const [appliedType, setAppliedType] = React.useState<string>("ALL");

  const selectableTanks = React.useMemo(() => {
    if (draftStationIds.length === 0) return tanks;
    return tanks.filter((tank) => draftStationIds.includes(tank.stationId));
  }, [tanks, draftStationIds]);

  const applyFilters = React.useCallback(() => {
    setAppliedStationIds(draftStationIds);
    setAppliedTankIds(draftTankIds);
    setAppliedProduct(draftProduct);
    setAppliedType(draftType);
    setIsOpen(false);
  }, [draftStationIds, draftTankIds, draftProduct, draftType]);

  const clearFilters = React.useCallback(() => {
    setDraftStationIds([]);
    setDraftTankIds([]);
    setDraftProduct("ALL");
    setDraftType("ALL");
    setAppliedStationIds([]);
    setAppliedTankIds([]);
    setAppliedProduct("ALL");
    setAppliedType("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(row.stationId)) return false;
      if (appliedTankIds.length > 0 && !appliedTankIds.includes(row.tankId)) return false;
      if (appliedProduct !== "ALL" && row.productType !== appliedProduct) return false;
      if (appliedType !== "ALL" && row.movementType !== appliedType) return false;
      return true;
    });
  }, [initialRows, appliedStationIds, appliedTankIds, appliedProduct, appliedType]);

  const metrics = React.useMemo(() => {
    let delivered = 0;
    let sold = 0;
    let lost = 0;
    let variance = 0;

    filteredRows.forEach((row) => {
      variance += row.variance;
      if (row.movementType === "DELIVERY") delivered += Math.abs(row.quantity);
      if (row.movementType === "SALE") sold += Math.abs(row.quantity);
      if (row.movementType === "LOSS") lost += Math.abs(row.quantity);
    });

    return { count: filteredRows.length, delivered, sold, lost, variance };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "records", label: "Movements", value: metrics.count, color: "#0d9488" },
        {
          key: "delivered",
          label: "Delivered",
          value: metrics.delivered,
          color: "#10b981",
          format: (n) => fmtLiters(n),
        },
        {
          key: "sold",
          label: "Sold",
          value: metrics.sold,
          color: "#3b82f6",
          format: (n) => fmtLiters(n),
        },
        {
          key: "lost",
          label: "Loss",
          value: metrics.lost,
          color: "#f43f5e",
          format: (n) => fmtLiters(n),
        },
        {
          key: "variance",
          label: "Net Variance",
          value: metrics.variance,
          color: metrics.variance < 0 ? "#f43f5e" : "#10b981",
          format: (n) => `${n > 0 ? "+" : ""}${fmtLiters(n)}`,
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<StockMovementRow>[]>(
    () => [
      {
        accessorKey: "recordedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatHumanReadableDate(row.original.recordedAt)}</span>
        ),
      },
      {
        accessorKey: "stationName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-medium">{row.original.stationName}</span>,
      },
      {
        accessorKey: "tankName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tank" />,
        meta: { label: "Tank" },
        cell: ({ row }) => <span>{row.original.tankName}</span>,
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
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
        accessorKey: "movementType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        meta: { label: "Type" },
        cell: ({ row }) => (
          <Badge variant="outline" className={cn("font-semibold", movementBadgeClass(row.original.movementType))}>
            {movementLabels[row.original.movementType]}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "balanceBefore",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Before" />,
        meta: { label: "Before" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtLiters(row.original.balanceBefore)}
          </span>
        ),
      },
      {
        accessorKey: "variance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Variance" />,
        meta: { label: "Variance" },
        cell: ({ row }) => {
          const variance = row.original.variance;
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                variance > 0 ? "text-emerald-600" : variance < 0 ? "text-rose-600" : "text-muted-foreground"
              )}
            >
              {variance > 0 ? "+" : ""}
              {fmtLiters(variance)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.variance, 0);
          return (
            <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {total > 0 ? "+" : ""}
              {fmtLiters(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "balanceAfter",
        header: ({ column }) => <DataTableColumnHeader column={column} title="After" />,
        meta: { label: "After" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {fmtLiters(row.original.balanceAfter)}
          </span>
        ),
      },
      {
        accessorKey: "recordedByName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Recorded By" />,
        meta: { label: "Recorded By" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.recordedByName}</span>
        ),
      },
      {
        accessorKey: "notes",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
        meta: { label: "Notes" },
        cell: ({ row }) => (
          <span className="line-clamp-1 text-xs text-muted-foreground">{row.original.notes || "—"}</span>
        ),
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<StockMovementRow>[]>(
    () => [
      {
        id: "movementType",
        label: "Type",
        options: MOVEMENT_TYPES.map((type) => ({ label: movementLabels[type], value: type })),
      },
      {
        id: "productType",
        label: "Product",
        options: ["PMS", "AGO", "DPK", "LPG"].map((p) => ({ label: p, value: p })),
      },
      {
        id: "tankName",
        label: "Tank",
        options: tanks.map((tank) => ({
          label: stations.length > 1 ? `${tank.name} (${tank.stationName})` : tank.name,
          value: tank.name,
        })),
      },
    ],
    [tanks, stations.length]
  );

  const filterSheet = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-9 gap-2">
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
          <div className="w-full space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Station</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
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
                    <label htmlFor="station-all" className="cursor-pointer text-sm font-medium leading-none">
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
                            const nextStationIds = draftStationIds.filter((id) => id !== s.id);
                            setDraftStationIds(nextStationIds);
                            setDraftTankIds((current) =>
                              current.filter((tankId) => {
                                const tank = tanks.find((item) => item.id === tankId);
                                return tank && (nextStationIds.length === 0 || nextStationIds.includes(tank.stationId));
                              })
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`station-${s.id}`}
                        className="cursor-pointer text-sm font-medium leading-none"
                      >
                        {s.name}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Tank</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    draftTankIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {draftTankIds.length === 0
                    ? "All Tanks"
                    : `${draftTankIds.length} tank(s)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="tank-all"
                      checked={draftTankIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setDraftTankIds([]);
                      }}
                    />
                    <label htmlFor="tank-all" className="cursor-pointer text-sm font-medium leading-none">
                      All Tanks
                    </label>
                  </div>
                  {selectableTanks.map((tank) => (
                    <div key={tank.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={`tank-${tank.id}`}
                        checked={draftTankIds.includes(tank.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDraftTankIds([...draftTankIds, tank.id]);
                          } else {
                            setDraftTankIds(draftTankIds.filter((id) => id !== tank.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`tank-${tank.id}`}
                        className="cursor-pointer text-sm font-medium leading-none"
                      >
                        {tank.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {tank.productType}
                          {stations.length > 1 ? ` · ${tank.stationName}` : ""}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
            <Select value={draftType} onValueChange={setDraftType}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {MOVEMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {movementLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Product</Label>
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
        </div>
        <SheetFooter className="border-t pt-4">
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            Reset Filters
          </Button>
          <Button className="w-full" onClick={applyFilters}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Stock Movements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auditable ledger of tank volume changes across stations.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-stock-movements"
        filterFields={filterFields}
        searchPlaceholder="Search station, tank, product..."
        toolbarActions={filterSheet}
        emptyMessage="No stock movements found for the selected filters."
      />
    </div>
  );
}
