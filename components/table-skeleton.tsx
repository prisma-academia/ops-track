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
  rows = 10,
  title,
  description,
}: {
  columns?: number;
  rows?: number;
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            {title && (
              <div className="h-6 w-40 bg-muted/50 rounded animate-pulse" />
            )}
            {description && (
              <div className="h-4 w-72 bg-muted/30 rounded animate-pulse" />
            )}
          </div>
          <div className="h-9 w-28 bg-muted/40 rounded animate-pulse" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div />
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-muted/30 rounded-full animate-pulse" />
          <div className="h-9 w-48 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>

      <Card className="w-full h-full py-0 overflow-hidden">
        <CardContent className="px-0">
          <div className="overflow-x-auto border-t border-border/40">
            <Table className="min-w-full">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  {Array.from({ length: columns }).map((_, i) => (
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
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className="px-4 py-3 first:ps-6 last:pe-6"
                      >
                        <div
                          className="h-5 bg-muted/40 rounded animate-pulse"
                          style={{
                            width: `${50 + Math.random() * 40}%`,
                            animationDelay: `${rowIndex * 50}ms`,
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
