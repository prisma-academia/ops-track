"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  DataTable,
  TableInsightCards,
  type TableInsightStat,
} from "@/components/tables";
import {
  DataTableFilterDrawer,
  type FilterConfig,
} from "@/components/data-table-filter-drawer";

export interface LedgerReportTableProps<TData> {
  tableId: string;
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  insightStats: TableInsightStat[];
  breakdownTitle?: string;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  emptyMessage?: string;
}

export function LedgerReportTable<TData>({
  tableId,
  data,
  columns,
  searchPlaceholder = "Search...",
  filters,
  insightStats,
  breakdownTitle,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  emptyMessage = "No results.",
}: LedgerReportTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = React.useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handlePageSizeChange = React.useCallback(
    (size: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pageSize", String(size));
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex flex-col gap-4">
      <TableInsightCards stats={insightStats} breakdownTitle={breakdownTitle} />

      <DataTable
        columns={columns}
        data={data}
        tableId={tableId}
        searchPlaceholder={searchPlaceholder}
        toolbarActions={
          filters?.length ? (
            <DataTableFilterDrawer filters={filters} />
          ) : undefined
        }
        hideToolbar={false}
        emptyMessage={emptyMessage}
        serverPagination={{
          page: currentPage,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}
