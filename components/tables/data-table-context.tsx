"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import type { DataTableFilterField } from "./types";

interface DataTableContextValue<TData> {
  table: Table<TData>;
  filterFields: DataTableFilterField<TData>[];
  enableColumnOrdering: boolean;
  isLoading?: boolean;
  /** Used to namespace localStorage keys and default export/print filenames. */
  tableId: string;
  /** Wraps the actual <table> element — used to grab it for print-only output. */
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

const DataTableContext = React.createContext<DataTableContextValue<unknown> | null>(
  null
);

export function DataTableProvider<TData>({
  table,
  filterFields = [],
  enableColumnOrdering = true,
  isLoading,
  tableId = "table",
  children,
}: React.PropsWithChildren<{
  table: Table<TData>;
  filterFields?: DataTableFilterField<TData>[];
  enableColumnOrdering?: boolean;
  isLoading?: boolean;
  tableId?: string;
}>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const value = React.useMemo(
    () => ({
      table,
      filterFields,
      enableColumnOrdering,
      isLoading,
      tableId,
      tableContainerRef,
    }),
    [table, filterFields, enableColumnOrdering, isLoading, tableId]
  );

  return (
    <DataTableContext.Provider value={value as DataTableContextValue<unknown>}>
      {children}
    </DataTableContext.Provider>
  );
}

export function useDataTable<TData = unknown>() {
  const context = React.useContext(DataTableContext);
  if (!context) {
    throw new Error("useDataTable must be used within a <DataTableProvider />");
  }
  return context as DataTableContextValue<TData>;
}
