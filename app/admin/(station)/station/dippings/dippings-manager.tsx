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

export type DippingRow = {
  id: string;
  source: "SESSION" | "LEGACY" | "WAYBILL";
  stationId: string;
  stationName: string;
  stationCode: string;
  tankId: string;
  tankName: string;
  productType: string;
  dippingType: "OPENING" | "CLOSING" | "WAYBILL";
  reason: string | null;
  dippingLiters: number;
  beforeLiters?: number | null;
  afterLiters?: number | null;
  variance?: number | null;
  recordedAt: string;
};

type Station = { id: string; name: string; code: string };
type TankOption = { id: string; name: string; stationId: string; stationName: string; productType: string };

const typeVariant: Record<DippingRow["dippingType"], "default" | "secondary" | "outline"> = {
  OPENING: "default",
  CLOSING: "secondary",
  WAYBILL: "outline",
};

const typeLabels: Record<DippingRow["dippingType"], string> = {
  OPENING: "Opening",
  CLOSING: "Closing",
  WAYBILL: "Waybill",
};

const sourceLabels: Record<DippingRow["source"], string> = {
  SESSION: "Session",
  LEGACY: "Legacy",
  WAYBILL: "Waybill",
};

const reasonLabels: Record<string, string> = {
  OPENING_DIP: "Opening Dip",
  CLOSING_DIP: "Closing Dip",
  END_OF_DAY: "End of Day",
  PRICE_CHANGE: "Price Change",
  ROUTINE: "Routine",
  MORNING: "Morning",
  EVENING: "Evening",
  WAYBILL_DISCHARGE: "Waybill Discharge",
};

function formatReason(reason: string | null) {
  if (!reason) return "—";
  return reasonLabels[reason] ?? reason.replaceAll("_", " ");
}

function fmtLiters(n: number) {
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

export function DippingsManager({
  initialRows,
  stations,
  tanks,
}: {
  initialRows: DippingRow[];
  stations: Station[];
  tanks: TankOption[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);
  const [draftTankIds, setDraftTankIds] = React.useState<string[]>([]);
  const [draftProduct, setDraftProduct] = React.useState<string>("ALL");
  const [draftType, setDraftType] = React.useState<string>("ALL");
  const [draftSource, setDraftSource] = React.useState<string>("ALL");

  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedTankIds, setAppliedTankIds] = React.useState<string[]>([]);
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");
  const [appliedType, setAppliedType] = React.useState<string>("ALL");
  const [appliedSource, setAppliedSource] = React.useState<string>("ALL");

  const selectableTanks = React.useMemo(() => {
    if (draftStationIds.length === 0) return tanks;
    return tanks.filter((tank) => draftStationIds.includes(tank.stationId));
  }, [tanks, draftStationIds]);

  const applyFilters = React.useCallback(() => {
    setAppliedStationIds(draftStationIds);
    setAppliedTankIds(draftTankIds);
    setAppliedProduct(draftProduct);
    setAppliedType(draftType);
    setAppliedSource(draftSource);
    setIsOpen(false);
  }, [draftStationIds, draftTankIds, draftProduct, draftType, draftSource]);

  const clearFilters = React.useCallback(() => {
    setDraftStationIds([]);
    setDraftTankIds([]);
    setDraftProduct("ALL");
    setDraftType("ALL");
    setDraftSource("ALL");
    setAppliedStationIds([]);
    setAppliedTankIds([]);
    setAppliedProduct("ALL");
    setAppliedType("ALL");
    setAppliedSource("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(row.stationId)) return false;
      if (appliedTankIds.length > 0 && !appliedTankIds.includes(row.tankId)) return false;
      if (appliedProduct !== "ALL" && row.productType !== appliedProduct) return false;
      if (appliedType !== "ALL" && row.dippingType !== appliedType) return false;
      if (appliedSource !== "ALL" && row.source !== appliedSource) return false;
      return true;
    });
  }, [initialRows, appliedStationIds, appliedTankIds, appliedProduct, appliedType, appliedSource]);

  const metrics = React.useMemo(() => {
    let openings = 0;
    let closings = 0;
    let waybillVolume = 0;

    filteredRows.forEach((row) => {
      if (row.dippingType === "OPENING") openings += 1;
      if (row.dippingType === "CLOSING") closings += 1;
      if (row.dippingType === "WAYBILL") waybillVolume += row.dippingLiters;
    });

    return { count: filteredRows.length, openings, closings, waybillVolume };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "records", label: "Records", value: metrics.count, color: "#0d9488" },
        { key: "openings", label: "Opening Dips", value: metrics.openings, color: "#3b82f6" },
        { key: "closings", label: "Closing Dips", value: metrics.closings, color: "#6366f1" },
        {
          key: "waybill",
          label: "Waybill Received",
          value: metrics.waybillVolume,
          color: "#f97316",
          format: (n) => fmtLiters(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<DippingRow>[]>(
    () => [
      {
        accessorKey: "recordedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
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
        accessorKey: "dippingType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        meta: { label: "Type" },
        cell: ({ row }) => (
          <Badge variant={typeVariant[row.original.dippingType]}>
            {typeLabels[row.original.dippingType]}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "beforeLiters",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Before" />,
        meta: { label: "Before" },
        cell: ({ row }) =>
          row.original.beforeLiters != null ? (
            <span className="font-mono tabular-nums text-muted-foreground">
              {fmtLiters(row.original.beforeLiters)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "variance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Variance" />,
        meta: { label: "Variance" },
        cell: ({ row }) => {
          const variance = row.original.variance;
          if (variance == null) return <span className="text-muted-foreground">—</span>;
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
            .rows.reduce((sum, row) => sum + (row.original.variance ?? 0), 0);
          return (
            <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {total > 0 ? "+" : ""}
              {fmtLiters(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "afterLiters",
        header: ({ column }) => <DataTableColumnHeader column={column} title="After" />,
        meta: { label: "After" },
        cell: ({ row }) =>
          row.original.afterLiters != null ? (
            <span className="font-mono tabular-nums">{fmtLiters(row.original.afterLiters)}</span>
          ) : (
            <span className="font-mono tabular-nums">{fmtLiters(row.original.dippingLiters)}</span>
          ),
      },
      {
        accessorKey: "reason",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
        meta: { label: "Reason" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatReason(row.original.reason)}</span>
        ),
      },
      {
        accessorKey: "source",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
        meta: { label: "Source" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{sourceLabels[row.original.source]}</span>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<DippingRow>[]>(
    () => [
      {
        id: "dippingType",
        label: "Type",
        options: [
          { label: "Opening", value: "OPENING" },
          { label: "Closing", value: "CLOSING" },
          { label: "Waybill", value: "WAYBILL" },
        ],
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
                <SelectItem value="OPENING">Opening</SelectItem>
                <SelectItem value="CLOSING">Closing</SelectItem>
                <SelectItem value="WAYBILL">Waybill</SelectItem>
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

          <div className="w-full space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Source</Label>
            <Select value={draftSource} onValueChange={setDraftSource}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="SESSION">Session</SelectItem>
                <SelectItem value="LEGACY">Legacy</SelectItem>
                <SelectItem value="WAYBILL">Waybill</SelectItem>
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
        <h1 className="text-xl font-semibold text-foreground">Dippings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opening, closing, and waybill dip readings across stations.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-dippings"
        filterFields={filterFields}
        searchPlaceholder="Search station, tank, product..."
        toolbarActions={filterSheet}
        emptyMessage="No dipping records found for the selected filters."
      />
    </div>
  );
}
