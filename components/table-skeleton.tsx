"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TableSkeleton({
  columns = 5,
  rows = 8,
  title,
  description,
  action,
  headers,
  showControls = true,
}: {
  columns?: number;
  rows?: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  headers?: string[];
  showControls?: boolean;
}) {
  const colCount = headers ? headers.length : columns;

  return (
    <div className="space-y-6">
      {(title || description || action) && (
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action ? (
            <div>{action}</div>
          ) : (
            <div className="h-9 w-28 bg-muted/40 rounded-md animate-pulse" />
          )}
        </div>
      )}

      {showControls && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="h-9 w-64 max-w-full bg-muted/30 rounded-md animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-muted/30 rounded-md animate-pulse" />
            <div className="h-9 w-24 bg-muted/30 rounded-md animate-pulse" />
          </div>
        </div>
      )}

      <Card className="w-full h-full py-0 overflow-hidden shadow-xs border-border/40">
        <CardContent className="px-0">
          <div className="overflow-x-auto border-t border-border/40">
            <Table className="min-w-full">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  {headers
                    ? headers.map((h, i) => (
                        <TableHead
                          key={i}
                          className="h-11 px-4 first:ps-6 last:pe-6"
                        >
                          <span className="text-xs font-semibold text-muted-foreground/80">
                            {h}
                          </span>
                        </TableHead>
                      ))
                    : Array.from({ length: colCount }).map((_, i) => (
                        <TableHead
                          key={i}
                          className="h-11 px-4 first:ps-6 last:pe-6"
                        >
                          <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
                        </TableHead>
                      ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/30">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Array.from({ length: colCount }).map((_, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className="px-4 py-3 first:ps-6 last:pe-6"
                      >
                        <div
                          className="h-4 bg-muted/40 rounded animate-pulse"
                          style={{
                            width: `${55 + ((rowIndex * 17 + colIndex * 23) % 35)}%`,
                            animationDelay: `${rowIndex * 40}ms`,
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
