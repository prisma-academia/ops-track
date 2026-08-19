"use client";

import * as React from "react";
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDataTable } from "./data-table-context";
import { exportTableToCsv, exportTableToExcel, printElement } from "./table-export";

/**
 * "Export" toolbar button — print, CSV, or Excel, all scoped to the current
 * table's filtered data. Printing only outputs the <table> itself (via a
 * detached iframe) so surrounding nav/toolbar/pagination never show up.
 */
export function DataTableExportMenu<TData>() {
  const { table, tableId, tableContainerRef } = useDataTable<TData>();

  const handlePrint = () => {
    const tableEl = tableContainerRef.current?.querySelector("table");
    if (tableEl) printElement(tableEl, tableId);
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg" className="cursor-pointer">
              <DownloadIcon className="size-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Print or export this table</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
          <PrinterIcon className="size-3.5 text-muted-foreground" />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportTableToCsv(table, `${tableId}.csv`)}
          className="cursor-pointer"
        >
          <FileTextIcon className="size-3.5 text-muted-foreground" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportTableToExcel(table, `${tableId}.xls`)}
          className="cursor-pointer"
        >
          <FileSpreadsheetIcon className="size-3.5 text-muted-foreground" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
