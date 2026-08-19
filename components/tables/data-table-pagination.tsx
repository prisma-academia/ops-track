"use client";

import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataTable } from "./data-table-context";

export interface ServerPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 25, 30, 40, 50, 100];

export function DataTablePagination<TData>({
  serverPagination,
}: {
  serverPagination?: ServerPagination;
}) {
  const { table } = useDataTable<TData>();

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = serverPagination
    ? serverPagination.totalCount
    : table.getFilteredRowModel().rows.length;

  const pageIndex = serverPagination
    ? serverPagination.page - 1
    : table.getState().pagination.pageIndex;
  const pageSize = serverPagination
    ? serverPagination.pageSize
    : table.getState().pagination.pageSize;
  const pageCount = serverPagination
    ? serverPagination.totalPages
    : table.getPageCount();

  const canPreviousPage = serverPagination
    ? serverPagination.hasPreviousPage
    : table.getCanPreviousPage();
  const canNextPage = serverPagination
    ? serverPagination.hasNextPage
    : table.getCanNextPage();

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.options.enableRowSelection ? (
          <span>
            {selectedCount} of {totalCount} row(s) selected.
          </span>
        ) : (
          <span>{totalCount} row(s) total.</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              const size = Number(value);
              if (serverPagination) {
                serverPagination.onPageSizeChange(size);
              } else {
                table.setPageSize(size);
              }
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {Math.max(1, pageCount)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() =>
              serverPagination ? serverPagination.onPageChange(1) : table.firstPage()
            }
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronFirstIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.page - 1)
                : table.previousPage()
            }
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.page + 1)
                : table.nextPage()
            }
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(serverPagination.totalPages)
                : table.lastPage()
            }
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronLastIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
