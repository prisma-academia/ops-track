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
  recordedAt: string;
};

type Station = { id: string; name: string; code: string };

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
}: {
  initialRows: DippingRow[];
  stations: Station[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);
  const [draftProduct, setDraftProduct] = React.useState<string>("ALL");
  const [draftType, setDraftType] = React.useState<string>("ALL");
  const [draftSource, setDraftSource] = React.useState<string>("ALL");

  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");
  const [appliedType, setAppliedType] = React.useState<string>("ALL");
  const [appliedSource, setAppliedSource] = React.useState<string>("ALL");

  const applyFilters = React.useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedProduct(draftProduct);
    setAppliedType(draftType);
    setAppliedSource(draftSource);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftProduct, draftType, draftSource]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftProduct("ALL");
    setDraftType("ALL");
    setDraftSource("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedProduct("ALL");
    setAppliedType("ALL");
    setAppliedSource("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(row.stationId)) return false;
      if (appliedProduct !== "ALL" && row.productType !== appliedProduct) return false;
      if (appliedType !== "ALL" && row.dippingType !== appliedType) return false;
      if (appliedSource !== "ALL" && row.source !== appliedSource) return false;

      const recordedAt = new Date(row.recordedAt);
      if (appliedDateRange?.from) {
        const start = new Date(appliedDateRange.from);
        start.setHours(0, 0, 0, 0);
        if (recordedAt < start) return false;
      }
      if (appliedDateRange?.to) {
        const end = new Date(appliedDateRange.to);
        end.setHours(23, 59, 59, 999);
        if (recordedAt > end) return false;
      }
      return true;
    });
  }, [initialRows, appliedStationIds, appliedProduct, appliedType, appliedSource, appliedDateRange]);

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
        accessorKey: "dippingLiters",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume (L)" />,
        meta: { label: "Volume (L)" },
        cell: ({ row }) => {
          const rowData = row.original;
          if (rowData.dippingType === "WAYBILL" && rowData.beforeLiters != null) {
            return (
              <div className="font-mono tabular-nums">
                <span className={cn(rowData.dippingLiters >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {rowData.dippingLiters >= 0 ? "+" : ""}
                  {fmtLiters(rowData.dippingLiters)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {rowData.beforeLiters.toLocaleString()} → {rowData.afterLiters?.toLocaleString() ?? "—"}
                </span>
              </div>
            );
          }
          return <span className="font-mono tabular-nums">{fmtLiters(rowData.dippingLiters)}</span>;
        },
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
    ],
    []
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
                            setDraftStationIds(draftStationIds.filter((id) => id !== s.id));
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

          <div className="w-full space-y-3">
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
