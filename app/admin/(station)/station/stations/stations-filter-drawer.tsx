"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { useDataTable } from "@/components/data-table-context";
import { Badge } from "@/components/ui/badge";
import type { StationSimple } from "./stations-manager";

export function StationsFilterDrawer({ stations }: { stations: StationSimple[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dataTable = useDataTable();

  const [open, setOpen] = useState(false);

  // Local draft states
  const [stationId, setStationId] = useState<string>("ALL");
  const [period, setPeriod] = useState<string>("30days");
  const [productType, setProductType] = useState<string>("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [salesMin, setSalesMin] = useState<string>("");
  const [salesMax, setSalesMax] = useState<string>("");
  const [stockMin, setStockMin] = useState<string>("");
  const [stockMax, setStockMax] = useState<string>("");

  // Calculate active filters count
  let activeCount = 0;
  if (searchParams.has("stationId") && searchParams.get("stationId") !== "ALL") activeCount++;
  if (searchParams.has("period") && searchParams.get("period") !== "30days") activeCount++;
  if (searchParams.has("productType") && searchParams.get("productType") !== "ALL") activeCount++;
  if (searchParams.has("salesMin") || searchParams.has("salesMax")) activeCount++;
  if (searchParams.has("stockMin") || searchParams.has("stockMax")) activeCount++;

  // Sync draft states when sheet opens
  useEffect(() => {
    if (open) {
      setStationId(searchParams.get("stationId") || "ALL");
      setPeriod(searchParams.get("period") || "30days");
      setProductType(searchParams.get("productType") || "ALL");
      setFrom(searchParams.get("from") || "");
      setTo(searchParams.get("to") || "");
      setSalesMin(searchParams.get("salesMin") || "");
      setSalesMax(searchParams.get("salesMax") || "");
      setStockMin(searchParams.get("stockMin") || "");
      setStockMax(searchParams.get("stockMax") || "");
    }
  }, [open, searchParams]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Station
    if (stationId && stationId !== "ALL") {
      params.set("stationId", stationId);
    } else {
      params.delete("stationId");
    }

    // Period
    if (period && period !== "30days") {
      params.set("period", period);
    } else {
      params.delete("period");
    }

    // Custom date range
    if (period === "custom") {
      if (from) params.set("from", from);
      else params.delete("from");

      if (to) params.set("to", to);
      else params.delete("to");
    } else {
      params.delete("from");
      params.delete("to");
    }

    // Product Type
    if (productType && productType !== "ALL") {
      params.set("productType", productType);
    } else {
      params.delete("productType");
    }

    // Sales range
    if (salesMin) params.set("salesMin", salesMin);
    else params.delete("salesMin");

    if (salesMax) params.set("salesMax", salesMax);
    else params.delete("salesMax");

    // Stock range
    if (stockMin) params.set("stockMin", stockMin);
    else params.delete("stockMin");

    if (stockMax) params.set("stockMax", stockMax);
    else params.delete("stockMax");

    params.delete("page");

    if (params.toString() !== searchParams.toString()) {
      dataTable?.startTransition?.();
    }
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("stationId");
    params.delete("period");
    params.delete("from");
    params.delete("to");
    params.delete("productType");
    params.delete("salesMin");
    params.delete("salesMax");
    params.delete("stockMin");
    params.delete("stockMax");
    params.delete("page");

    setStationId("ALL");
    setPeriod("30days");
    setProductType("ALL");
    setFrom("");
    setTo("");
    setSalesMin("");
    setSalesMax("");
    setStockMin("");
    setStockMax("");

    if (params.toString() !== searchParams.toString()) {
      dataTable?.startTransition?.();
    }
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-sm relative text-xs h-9">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {activeCount > 0 && (
            <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Filter Stations & Stats</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the table and update the stats cards.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-5 space-y-4 px-2">
          {/* Station Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Stations ({stations.length})
                </SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="text-xs">Today</SelectItem>
                <SelectItem value="7days" className="text-xs">Last 7 Days</SelectItem>
                <SelectItem value="30days" className="text-xs">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth" className="text-xs">This Month</SelectItem>
                <SelectItem value="custom" className="text-xs">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {period === "custom" && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <Label className="text-xs font-medium text-muted-foreground">Custom Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    className="h-8.5 text-xs"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    className="h-8.5 text-xs"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Product Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Product Type</Label>
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Products</SelectItem>
                <SelectItem value="PMS" className="text-xs">PMS (Petrol)</SelectItem>
                <SelectItem value="AGO" className="text-xs">AGO (Diesel)</SelectItem>
                <SelectItem value="DPK" className="text-xs">DPK (Kerosene)</SelectItem>
                <SelectItem value="LPG" className="text-xs">LPG (Gas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Today's Sales Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Today Sales Range (₦)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Min</Label>
                <NumberInput
                  placeholder="Min ₦"
                  value={salesMin}
                  onChange={(v) => setSalesMin(v.toString())}
                  className="h-8.5 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Max</Label>
                <NumberInput
                  placeholder="Max ₦"
                  value={salesMax}
                  onChange={(v) => setSalesMax(v.toString())}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Last Closing Stock Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Last Closing Stock (L)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Min</Label>
                <NumberInput
                  placeholder="Min L"
                  value={stockMin}
                  onChange={(v) => setStockMin(v.toString())}
                  className="h-8.5 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Max</Label>
                <NumberInput
                  placeholder="Max L"
                  value={stockMax}
                  onChange={(v) => setStockMax(v.toString())}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-4 flex gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleReset} className="w-full text-xs">
            Reset Filters
          </Button>
          <Button onClick={handleApply} className="w-full text-xs">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
