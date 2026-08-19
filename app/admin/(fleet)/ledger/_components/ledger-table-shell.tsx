"use client";

import React, { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, Download, Search } from "lucide-react";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon, ChevronFirstIcon, ChevronLastIcon } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface LedgerTableShellProps<TData> {
  title: string;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filterNode?: React.ReactNode;
}

export function LedgerTableShell<TData>({
  title,
  data,
  columns,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  filterNode,
}: LedgerTableShellProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    manualPagination: true,
    pageCount: totalPages,
  });

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("search", val);
    else params.delete("search");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (data.length === 0) return;
    
    const headers = table.getAllColumns().map(c => typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id).filter(Boolean);
    const rows = table.getRowModel().rows.map(row => {
      return row.getVisibleCells().map(cell => {
        const val = cell.getValue();
        return val ? `"${String(val).replace(/"/g, '""')}"` : '""';
      });
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="print:shadow-none print:border-none">
      <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4 space-y-0 print:hidden">
        <CardTitle>{title}</CardTitle>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {filterNode}
          
          <InputGroup className="max-w-[200px]">
            <InputGroupInput
              placeholder="Search..."
              value={searchValue}
              onChange={handleSearch}
              className="text-sm h-9"
            />
            <InputGroupAddon className="h-9">
              <Search size={14} />
            </InputGroupAddon>
          </InputGroup>

          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-3 hidden sm:flex">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 px-3">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 border-t border-border/40 print:border-none">
        <ScrollArea
          className="w-[calc(100vw-2.25rem)] md:w-auto"
        >
          <Table>
            <TableHeader className="bg-muted/30 print:bg-transparent">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-11 px-4 first:ps-6 last:pe-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
            <TableBody className="divide-y divide-border/30 print:divide-stone-300">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap px-4 py-3 first:ps-6 last:pe-6 text-sm">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <CardFooter className="block py-3 px-4 border-t border-border/40 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
            <span className="font-medium">{totalCount}</span> records.
          </div>
          
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronFirstIcon className="h-4 w-4" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <div className="flex items-center justify-center text-sm font-medium h-8 px-4 border rounded-md">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </div>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronLastIcon className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardFooter>
    </Card>
  );
}
