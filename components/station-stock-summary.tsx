"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface StationStockData {
  stationId: string;
  stationName: string;
  stationCode: string;
  stock: { PMS: number; AGO: number; DPK: number; LPG: number };
  expected: { PMS: number; AGO: number; DPK: number; LPG: number };
}

interface StationStockSummaryProps {
  data: StationStockData[];
}

export function StationStockSummary({ data }: StationStockSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No station stock data available.
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num === 0) return "0";
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return num.toString();
  };

  const renderStockCell = (stock: number, expected: number) => {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="font-semibold text-sm">{formatNumber(stock)}</span>
        {expected > 0 ? (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            +{formatNumber(expected)}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground opacity-50">-</span>
        )}
      </div>
    );
  };

  return (
    <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/30 border-b border-stone-200 dark:border-stone-800">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Station Stock Overview</span>
          <span className="text-[10px] lowercase tracking-normal">Stock / Expected</span>
        </CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] h-10 text-xs pl-4">Station</TableHead>
              <TableHead className="text-center h-10 text-xs">PMS (L)</TableHead>
              <TableHead className="text-center h-10 text-xs">AGO (L)</TableHead>
              <TableHead className="text-center h-10 text-xs">DPK (L)</TableHead>
              <TableHead className="text-center h-10 text-xs">LPG (Kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.stationId}>
                <TableCell className="font-medium text-xs pl-4">
                  <div className="flex flex-col">
                    <span>{row.stationName}</span>
                    <span className="text-[10px] text-muted-foreground">{row.stationCode}</span>
                  </div>
                </TableCell>
                <TableCell className="p-2 align-top">{renderStockCell(row.stock.PMS, row.expected.PMS)}</TableCell>
                <TableCell className="p-2 align-top">{renderStockCell(row.stock.AGO, row.expected.AGO)}</TableCell>
                <TableCell className="p-2 align-top">{renderStockCell(row.stock.DPK, row.expected.DPK)}</TableCell>
                <TableCell className="p-2 align-top">{renderStockCell(row.stock.LPG, row.expected.LPG)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
