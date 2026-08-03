"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  Search,
  Filter,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { DataTableContext } from "./data-table-context";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  description?: string;
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  headerAction?: React.ReactNode;
  rowHref?: (row: TData) => string | null;
  getRowClassName?: (row: TData) => string;
  empty?: string;
  filterColumnId?: string;
  filterNode?: React.ReactNode;
  serverPagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  isLoading?: boolean;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  description,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 25,
  headerAction,
  rowHref,
  getRowClassName,
  empty = "No results found.",
  filterColumnId,
  filterNode,
  serverPagination,
  isLoading = false,
  onSearchChange,
  searchValue,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    setIsTransitioning(false);
  }, [searchParams]);

  const handleStartTransition = React.useCallback(() => {
    setIsTransitioning(true);
  }, []);

  const showSkeleton = isLoading || isTransitioning;

  const effectiveSearchKey = searchKey || filterColumnId;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: !!serverPagination,
    pageCount: serverPagination?.totalPages ?? -1,
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <DataTableContext.Provider value={{ startTransition: handleStartTransition }}>
      <div className="space-y-6">
        {(title || effectiveSearchKey || headerAction || filterColumnId || filterNode) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="space-y-1">
            {title && (
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {filterNode && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter size={16} />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="py-4 space-y-4">
                    {filterNode && (
                      <div className="space-y-2">
                        {filterNode}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {effectiveSearchKey && (
              <InputGroup className="max-w-xs">
                <InputGroupInput
                  placeholder={searchPlaceholder}
                  value={searchValue !== undefined ? searchValue : ((table.getColumn(effectiveSearchKey)?.getFilterValue() as string) ?? "")}
                  onChange={(event) => {
                    if (onSearchChange) {
                      onSearchChange(event.target.value);
                    } else {
                      table.getColumn(effectiveSearchKey)?.setFilterValue(event.target.value);
                    }
                  }}
                  className="text-sm"
                />
                <InputGroupAddon>
                  <Search size={16} />
                </InputGroupAddon>
              </InputGroup>
            )}
            {headerAction}
          </div>
        </div>
      )}

      <Card className="w-full h-full py-0 overflow-hidden">
        <CardContent className="px-0">
          <div className="overflow-x-auto border-t border-border/40">
            <Table className="min-w-full">
              <TableHeader className="bg-muted/30">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 px-4 first:ps-6 last:pe-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              header.column.getCanSort() &&
                                "flex cursor-pointer select-none items-center gap-2 hover:text-foreground transition-colors"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: <ChevronUpIcon size={14} />,
                              desc: <ChevronDownIcon size={14} />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody className="divide-y divide-border/30">
                {showSkeleton ? (
                  Array.from({ length: serverPagination?.pageSize || pageSize }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {columns.map((column, colIndex) => (
                        <TableCell key={`cell-${colIndex}`} className="px-4 py-3">
                          <div className="h-5 bg-muted/50 rounded animate-pulse w-full"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const href = rowHref ? rowHref(row.original) : null;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "group hover:bg-muted/20 transition-colors",
                          href && "cursor-pointer",
                          getRowClassName && getRowClassName(row.original)
                        )}
                        onClick={() => {
                          if (href) router.push(href);
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap px-4 py-3 first:ps-6 last:pe-6 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {empty}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border/40 gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select
                  onValueChange={(value) => {
                    if (serverPagination) {
                      handleStartTransition();
                      serverPagination.onPageSizeChange(Number(value));
                    } else {
                      table.setPageSize(Number(value))
                    }
                  }}
                  value={serverPagination ? serverPagination.pageSize.toString() : table.getState().pagination.pageSize.toString()}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-transparent border-border/40">
                    <SelectValue placeholder={serverPagination ? serverPagination.pageSize : table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {[5, 10, 20, 25, 30, 40, 50, 100].map((pageSizeOpt) => (
                      <SelectItem key={pageSizeOpt} value={pageSizeOpt.toString()}>
                        {pageSizeOpt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden sm:block">
                Showing {serverPagination 
                  ? `${(serverPagination.page - 1) * serverPagination.pageSize + 1} - ${Math.min(serverPagination.page * serverPagination.pageSize, serverPagination.totalCount)} of ${serverPagination.totalCount}`
                  : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - ${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of ${table.getFilteredRowModel().rows.length}`}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Pagination>
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent border-border/40 hover:bg-muted"
                      onClick={() => {
                        if (serverPagination) {
                          handleStartTransition();
                          serverPagination.onPageChange(1);
                        } else {
                          table.firstPage();
                        }
                      }}
                      disabled={serverPagination ? !serverPagination.hasPreviousPage : !table.getCanPreviousPage()}
                    >
                      <ChevronFirstIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent border-border/40 hover:bg-muted"
                      onClick={() => {
                        if (serverPagination) {
                          handleStartTransition();
                          serverPagination.onPageChange(serverPagination.page - 1);
                        } else {
                          table.previousPage();
                        }
                      }}
                      disabled={serverPagination ? !serverPagination.hasPreviousPage : !table.getCanPreviousPage()}
                    >
                      <ChevronLeftIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <div className="text-xs px-2 text-muted-foreground">
                    Page {serverPagination ? serverPagination.page : table.getState().pagination.pageIndex + 1} of {Math.max(1, serverPagination ? serverPagination.totalPages : table.getPageCount())}
                  </div>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent border-border/40 hover:bg-muted"
                      onClick={() => {
                        if (serverPagination) {
                          handleStartTransition();
                          serverPagination.onPageChange(serverPagination.page + 1);
                        } else {
                          table.nextPage();
                        }
                      }}
                      disabled={serverPagination ? !serverPagination.hasNextPage : !table.getCanNextPage()}
                    >
                      <ChevronRightIcon size={16} />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent border-border/40 hover:bg-muted"
                      onClick={() => {
                        if (serverPagination) {
                          handleStartTransition();
                          serverPagination.onPageChange(serverPagination.totalPages);
                        } else {
                          table.lastPage();
                        }
                      }}
                      disabled={serverPagination ? !serverPagination.hasNextPage : !table.getCanNextPage()}
                    >
                      <ChevronLastIcon size={16} />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DataTableContext.Provider>
  );
}
