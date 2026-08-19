"use client";

import * as React from "react";
import { RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDataTable } from "./data-table-context";
import { DataTableExportMenu } from "./data-table-export-menu";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  /** Extra actions rendered to the left of the view-options button. */
  actions?: React.ReactNode;
  /** Called when the refresh button is clicked. */
  onRefresh?: () => void;
}

export function DataTableToolbar<TData>({
  searchPlaceholder = "Search data table...",
  actions,
  onRefresh,
}: DataTableToolbarProps) {
  const { table } = useDataTable<TData>();
  // TODO: wire this up to an actual "date" column filter once reports have one.
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const isFiltered =
    table.getState().columnFilters.length > 0 || !!table.getState().globalFilter;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-lg"
                className="cursor-pointer"
                onClick={() => onRefresh?.()}
              >
                <RefreshCwIcon className="size-4" />
                <span className="sr-only">Refresh</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>

          <DateRangeFilter
            date={dateRange}
            setDate={setDateRange}
            tooltip="Filter by date range (coming soon)"
          />

          {isFiltered ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="cursor-pointer"
                  onClick={() => {
                    table.resetColumnFilters();
                    table.setGlobalFilter("");
                  }}
                >
                  <XIcon />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all filters</TooltipContent>
            </Tooltip>
          ) : null}

          {actions}
          <DataTableExportMenu />
          <DataTableViewOptions />
        </div>
      </div>
    </div>
  );
}
