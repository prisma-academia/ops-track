"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableProvider, useDataTable } from "./data-table-context";
import { DataTablePagination, type ServerPagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { useLocalStorage } from "./use-local-storage";
import type { DataTableFilterField } from "./types";

export type { DataTableFilterField, FacetedOption } from "./types";
export { DataTableColumnHeader } from "./data-table-column-header";

function getLeafColumnIds<TData, TValue>(columns: ColumnDef<TData, TValue>[]): string[] {
  const ids: string[] = [];
  for (const column of columns) {
    if ("columns" in column && Array.isArray(column.columns)) {
      ids.push(...getLeafColumnIds(column.columns as ColumnDef<TData, TValue>[]));
    } else {
      ids.push(column.id ?? (column as { accessorKey?: string }).accessorKey ?? "");
    }
  }
  return ids.filter(Boolean);
}

function mergeColumnOrder(stored: string[], defaults: string[]): string[] {
  if (!stored.length) return defaults;
  const defaultSet = new Set(defaults);
  const kept = stored.filter((id) => defaultSet.has(id));
  if (!kept.length) return defaults;
  const result = [...kept];
  for (const id of defaults) {
    if (result.includes(id)) continue;
    const defIndex = defaults.indexOf(id);
    let insertAt = result.length;
    for (let i = defIndex - 1; i >= 0; i--) {
      const pos = result.indexOf(defaults[i]!);
      if (pos !== -1) {
        insertAt = pos + 1;
        break;
      }
    }
    result.splice(insertAt, 0, id);
  }
  return result;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Unique key used to persist column visibility & order in localStorage. */
  tableId?: string;
  /** Columns that get a checkbox faceted filter in the toolbar. */
  filterFields?: DataTableFilterField<TData>[];
  searchPlaceholder?: string;
  /** Extra actions (e.g. "Export", "Create") rendered in the toolbar. */
  toolbarActions?: React.ReactNode;
  /** Called when the toolbar's refresh button is clicked. */
  onRefresh?: () => void;
  /** Hide the search/filter/view-options toolbar entirely. */
  hideToolbar?: boolean;
  /** Hide the pagination footer entirely. */
  hidePagination?: boolean;
  pageSize?: number;
  rowHref?: (row: TData) => string | null | undefined;
  getRowClassName?: (row: TData) => string | undefined;
  emptyMessage?: string;
  isLoading?: boolean;
  enableColumnOrdering?: boolean;
  serverPagination?: ServerPagination;
  /** Extra HTML inserted under the print document title (order details, etc.). */
  printExtraHtml?: string;
  hideSearch?: boolean;
  hideDateFilter?: boolean;
  /** Extra row content rendered under a parent row (full table width). */
  renderSubRow?: (row: TData) => React.ReactNode | null;
  /** Optional title to render on the left side of the toolbar. */
  title?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  tableId = "data-table",
  filterFields = [],
  searchPlaceholder = "Search...",
  toolbarActions,
  onRefresh,
  hideToolbar = false,
  hidePagination = false,
  pageSize = 10,
  rowHref,
  getRowClassName,
  emptyMessage = "No results.",
  isLoading = false,
  enableColumnOrdering = true,
  serverPagination,
  printExtraHtml,
  hideSearch = false,
  hideDateFilter = false,
  renderSubRow,
  title,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(`${tableId}:column-visibility`, {});
  const defaultColumnOrder = React.useMemo(
    () => getLeafColumnIds(columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [storedColumnOrder, setColumnOrder] = useLocalStorage<string[]>(
    `${tableId}:column-order`,
    defaultColumnOrder
  );
  const columnOrder = React.useMemo(
    () => mergeColumnOrder(storedColumnOrder, defaultColumnOrder),
    [storedColumnOrder, defaultColumnOrder]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columnFilters, globalFilter]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      globalFilter,
      pagination,
    },
    manualPagination: !!serverPagination,
    pageCount: serverPagination?.totalPages ?? undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <DataTableProvider
      table={table}
      filterFields={filterFields}
      enableColumnOrdering={enableColumnOrdering}
      isLoading={isLoading}
      tableId={tableId}
      printExtraHtml={printExtraHtml}
    >
      <DataTableBody
        columns={columns}
        hideToolbar={hideToolbar}
        hidePagination={hidePagination}
        searchPlaceholder={searchPlaceholder}
        toolbarActions={toolbarActions}
        onRefresh={onRefresh}
        hideSearch={hideSearch}
        hideDateFilter={hideDateFilter}
        rowHref={rowHref}
        getRowClassName={getRowClassName}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        pageSize={pagination.pageSize}
        serverPagination={serverPagination}
        renderSubRow={renderSubRow}
        title={title}
      />
    </DataTableProvider>
  );
}

function DataTableBody<TData, TValue>({
  columns,
  hideToolbar,
  hidePagination,
  searchPlaceholder,
  toolbarActions,
  onRefresh,
  hideSearch,
  hideDateFilter,
  rowHref,
  getRowClassName,
  emptyMessage,
  isLoading,
  pageSize,
  serverPagination,
  renderSubRow,
  title,
}: {
  columns: ColumnDef<TData, TValue>[];
  hideToolbar: boolean;
  hidePagination: boolean;
  searchPlaceholder?: string;
  toolbarActions?: React.ReactNode;
  onRefresh?: () => void;
  hideSearch?: boolean;
  hideDateFilter?: boolean;
  rowHref?: (row: TData) => string | null | undefined;
  getRowClassName?: (row: TData) => string | undefined;
  emptyMessage?: string;
  isLoading?: boolean;
  pageSize: number;
  serverPagination?: ServerPagination;
  renderSubRow?: (row: TData) => React.ReactNode | null;
  title?: React.ReactNode;
}) {
  const router = useRouter();
  const { table, tableContainerRef } = useDataTable<TData>();
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  // REMINDER: only render a <tfoot> (e.g. column totals) if at least one
  // column actually defines a `footer` — keeps it fully opt-in per table.
  const hasFooter = table.getAllLeafColumns().some((c) => !!c.columnDef.footer);

  return (
    <div className="flex w-full flex-col">
      <div className="flex max-w-full flex-1 flex-col border-border">
        {!hideToolbar ? (
          <div className="flex flex-col gap-4 p-0 pb-4 sm:sticky sm:top-0 sm:z-10">
            <DataTableToolbar
              searchPlaceholder={searchPlaceholder}
              actions={toolbarActions}
              onRefresh={onRefresh}
              hideSearch={hideSearch}
              hideDateFilter={hideDateFilter}
              title={title}
            />
          </div>
        ) : null}

        <div
          ref={tableContainerRef}
          className="overflow-x-auto border-x border-border [&_[data-slot=table-container]]:overflow-visible"
        >
          <Table className="min-w-max border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50 [&>:not(:last-child)]:border-r"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "whitespace-nowrap border-t border-b border-border",
                        header.colSpan > 1 && "text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="[&>:not(:last-child)]:border-r">
                    {Array.from({ length: visibleColumnCount }).map((_, j) => (
                      <TableCell key={`skeleton-cell-${j}`} className="border-b border-border">
                        <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const href = rowHref?.(row.original);
                  const subRowContent = renderSubRow?.(row.original) ?? null;
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "[&>:not(:last-child)]:border-r",
                          href && "cursor-pointer",
                          getRowClassName?.(row.original)
                        )}
                        onClick={href ? () => router.push(href) : undefined}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap border-b border-border">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {subRowContent ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={visibleColumnCount || columns.length}
                            className="p-0 border-b border-border"
                          >
                            {subRowContent}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount || columns.length}
                    className="h-24 border-b border-border text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {hasFooter ? (
              <TableFooter>
                {table.getFooterGroups()
                  .filter((group) =>
                    group.headers.some(
                      (header) => !header.isPlaceholder && header.column.columnDef.footer
                    )
                  )
                  .map((footerGroup) => (
                  <TableRow
                    key={footerGroup.id}
                    className="bg-muted/50 hover:bg-muted/50 [&>:not(:last-child)]:border-r"
                  >
                    {footerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
                        colSpan={header.colSpan}
                        className="whitespace-nowrap border-t border-border font-semibold"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext()
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableFooter>
            ) : null}
          </Table>
        </div>

        {!hidePagination ? (
          <div className="p-2">
            <DataTablePagination serverPagination={serverPagination} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
