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
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>(`${tableId}:column-visibility`, {});
  const defaultColumnOrder = React.useMemo(
    () => columns.map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>(
    `${tableId}:column-order`,
    defaultColumnOrder
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
    >
      <DataTableBody
        columns={columns}
        hideToolbar={hideToolbar}
        hidePagination={hidePagination}
        searchPlaceholder={searchPlaceholder}
        toolbarActions={toolbarActions}
        onRefresh={onRefresh}
        rowHref={rowHref}
        getRowClassName={getRowClassName}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        pageSize={pagination.pageSize}
        serverPagination={serverPagination}
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
  rowHref,
  getRowClassName,
  emptyMessage,
  isLoading,
  pageSize,
  serverPagination,
}: {
  columns: ColumnDef<TData, TValue>[];
  hideToolbar: boolean;
  hidePagination: boolean;
  searchPlaceholder?: string;
  toolbarActions?: React.ReactNode;
  onRefresh?: () => void;
  rowHref?: (row: TData) => string | null | undefined;
  getRowClassName?: (row: TData) => string | undefined;
  emptyMessage?: string;
  isLoading?: boolean;
  pageSize: number;
  serverPagination?: ServerPagination;
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
            />
          </div>
        ) : null}

        <div ref={tableContainerRef} className="overflow-x-auto border-x border-border">
          <Table className="border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50 [&>:not(:last-child)]:border-r"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="truncate border-t border-b border-border"
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
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "[&>:not(:last-child)]:border-r",
                        href && "cursor-pointer",
                        getRowClassName?.(row.original)
                      )}
                      onClick={href ? () => router.push(href) : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="truncate border-b border-border">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
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
                {table.getFooterGroups().map((footerGroup) => (
                  <TableRow
                    key={footerGroup.id}
                    className="bg-muted/50 hover:bg-muted/50 [&>:not(:last-child)]:border-r"
                  >
                    {footerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
                        className="truncate border-t border-border font-semibold"
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
