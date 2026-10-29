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
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  /** Extra actions rendered to the left of the view-options button. */
  actions?: React.ReactNode;
  /** Called when the refresh button is clicked. */
  onRefresh?: () => void;
  hideSearch?: boolean;
  hideDateFilter?: boolean;
  dateRange?: DateRange;
  onDateRangeChange?: (date: DateRange | undefined) => void;
  hasExternalFilters?: boolean;
  onFiltersReset?: () => void;
  showFacetedFilters?: boolean;
  title?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  searchPlaceholder = "Search data table...",
  actions,
  onRefresh,
  hideSearch = false,
  hideDateFilter = false,
  dateRange,
  onDateRangeChange,
  hasExternalFilters = false,
  onFiltersReset,
  showFacetedFilters = false,
  title,
}: DataTableToolbarProps) {
  const { table, filterFields } = useDataTable<TData>();
  const [uncontrolledDateRange, setUncontrolledDateRange] = React.useState<
    DateRange | undefined
  >(undefined);
  const isDateControlled = onDateRangeChange != null;
  const activeDateRange = isDateControlled ? dateRange : uncontrolledDateRange;
  const setActiveDateRange = isDateControlled ? onDateRangeChange : setUncontrolledDateRange;
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter ||
    hasExternalFilters;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!hideSearch ? (
          <div className="relative mr-auto w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getState().globalFilter as string) ?? ""}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="h-9 pl-8"
            />
          </div>
        ) : title ? (
          <div className="mr-auto font-semibold">
            {title}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
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

          {!hideDateFilter ? (
            <DateRangeFilter
              date={activeDateRange}
              setDate={setActiveDateRange}
              tooltip={isDateControlled ? "Filter by date range" : "Filter by date range (coming soon)"}
            />
          ) : null}

          {showFacetedFilters
            ? filterFields.map((field) => {
                const column = table.getColumn(field.id as string);
                if (!column) return null;
                return (
                  <DataTableFacetedFilter
                    key={field.id as string}
                    column={column}
                    title={field.label}
                    options={field.options}
                  />
                );
              })
            : null}

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
                    onFiltersReset?.();
                  }}
                >
                  <XIcon />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all filters</TooltipContent>
            </Tooltip>
          ) : null}

          {actions != null ? (
            <React.Fragment key="toolbar-actions">{actions}</React.Fragment>
          ) : null}
          <DataTableExportMenu />
          <DataTableViewOptions />
        </div>
      </div>
    </div>
  );
}
