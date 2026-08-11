"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatShortCurrency } from "@/lib/utils";
import {
  Truck,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  BarChart3,
  Wrench,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TruckRow {
  id: string;
  plateNumber: string;
  name: string | null;
  transports: Array<{
    id: string;
    litersCarried: number;
    status: string;
    deliveries: Array<{
      litersReceived: number | null;
      litersDespatched: number | null;
    }>;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
  }>;
}

interface Props {
  initialTrucks: TruckRow[];
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L`;
}

export function AssetsReportManager({ initialTrucks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const aggregatedRows = useMemo(() => {
    return initialTrucks.map((truck, i) => {
      const tripsCount = truck.transports.length;
      let totalCarried = 0;
      let totalDelivered = 0;
      
      truck.transports.forEach(t => {
        totalCarried += Number(t.litersCarried || 0);
        t.deliveries.forEach(d => {
          const des = Number(d.litersDespatched || 0);
          totalDelivered += d.litersReceived !== null ? Number(d.litersReceived) : des;
        });
      });

      const maintenanceCost = truck.transactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      return {
        sn: i + 1,
        id: truck.id,
        plateNumber: truck.plateNumber,
        name: truck.name,
        tripsCount,
        totalCarried,
        totalDelivered,
        maintenanceCost
      };
    });
  }, [initialTrucks]);

  const stats = useMemo(() => {
    return aggregatedRows.reduce((acc, curr) => {
      acc.totalTrips += curr.tripsCount;
      acc.totalCost += curr.maintenanceCost;
      return acc;
    }, { totalTrips: 0, totalCost: 0 });
  }, [aggregatedRows]);

  const chartData = useMemo(() => {
    // Top 10 by maintenance cost
    return [...aggregatedRows]
      .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
      .slice(0, 10);
  }, [aggregatedRows]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "sn",
        accessorKey: "sn",
        header: "S/N",
        size: 60,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {row.original.sn}
          </span>
        ),
      },
      {
        id: "plateNumber",
        accessorKey: "plateNumber",
        header: "Plate Number",
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm font-bold text-foreground whitespace-nowrap uppercase">
            {row.original.plateNumber}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name / ID",
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.name || "—"}
          </span>
        ),
      },
      {
        id: "tripsCount",
        accessorKey: "tripsCount",
        header: () => <div className="text-right whitespace-nowrap">Trips</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums text-blue-600">
            {row.original.tripsCount}
          </div>
        ),
      },
      {
        id: "totalCarried",
        accessorKey: "totalCarried",
        header: () => <div className="text-right whitespace-nowrap">Volume Carried</div>,
        size: 140,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums">
            {fmtQty(row.original.totalCarried)}
          </div>
        ),
      },
      {
        id: "maintenanceCost",
        accessorKey: "maintenanceCost",
        header: () => <div className="text-right whitespace-nowrap">Maintenance Cost</div>,
        size: 150,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-bold text-rose-600 tabular-nums">
            {fmtMoney(row.original.maintenanceCost)}
          </div>
        ),
      },
    ],
    []
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: aggregatedRows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-6 transition-all print:m-0 print:p-0 print:bg-white print:text-black print:space-y-3",
        isFullscreen && "bg-background p-6 overflow-auto h-full"
      )}
    >
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          .hide-on-print { display: none; }
        }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
            Fleet Assets Performance Report
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto print:hidden">
          <div className="shrink-0 flex gap-2">
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Print report" className="h-10 w-10">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen view"} className="h-10 w-10">
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full">
                 <Truck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Active Assets</p>
             </div>
             <p className="text-3xl font-bold text-slate-600">{aggregatedRows.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                 <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Trips Completed</p>
             </div>
             <p className="text-3xl font-bold text-blue-600">{stats.totalTrips}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-full">
                 <Wrench className="h-5 w-5 text-rose-600 dark:text-rose-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Fleet Maintenance Cost</p>
             </div>
             <p className="text-3xl font-bold text-rose-600">{formatShortCurrency(stats.totalCost)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-border/40 shadow-xs hide-on-print">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Highest Maintenance Costs (Top 10)
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="plateNumber" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₦${(value / 1000).toFixed(1)}k`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [fmtMoney(Number(value)), undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="maintenanceCost" name="Maintenance Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full py-0 overflow-hidden print:shadow-none print:border-none print:bg-transparent">
        <CardContent className="px-0">
          <div className="overflow-x-auto border-t border-border/40 relative print:overflow-visible print:border-none print:w-full print:max-w-none">
            <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:border-black/30 print:text-[10px] print:w-full">
              <thead className="bg-muted/50 border-b border-border/50 print:border-black/30 print:bg-transparent">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-none">
                    {headerGroup.headers.map((header) => {
                      return (
                        <th
                          key={header.id}
                          style={{
                            width: header.column.getSize(),
                            minWidth: header.column.getSize(),
                          }}
                          className={cn(
                            "h-9 px-2 py-1.5 text-[11px] font-bold text-foreground bg-muted/50 border border-border/50 print:border-black/30 uppercase tracking-wider whitespace-nowrap text-left print:text-[9px] print:text-black print:bg-transparent"
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cn(
                                header.column.getCanSort() &&
                                  "flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground transition-colors"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {
                                {
                                  asc: <ChevronUpIcon size={13} />,
                                  desc: <ChevronDownIcon size={13} />,
                                }[header.column.getIsSorted() as string] ?? null
                              }
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "group border-b border-border/50 hover:bg-muted/30 transition-colors print:border-black/30",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/10 print:bg-transparent"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-2 py-1.5 align-middle border-x border-border/50 print:border-black/30"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground border-x border-b border-border/50"
                    >
                      No assets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
