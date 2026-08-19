"use client";

import * as React from "react";
import { format } from "date-fns";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import type { TableInsightStat } from "./table-insight-utils";

export type { TableInsightStat, TableInsightTrendPoint } from "./table-insight-utils";

export interface TableInsightCardsProps {
  stats: TableInsightStat[];
  /** Heading on the radial breakdown card — defaults to current month. */
  breakdownTitle?: string;
}

export function TableInsightCards({
  stats,
  breakdownTitle = format(new Date(), "MMMM"),
}: TableInsightCardsProps) {
  const radialData = React.useMemo(
    () => stats.map((item) => ({ ...item, fill: item.color })),
    [stats]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">
          {stats.map((item) => (
            <div key={item.key} className="flex min-w-0 items-center gap-2">
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-sm font-semibold text-card-foreground">
                  {item.value}
                </span>
                <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold text-card-foreground">{breakdownTitle}</p>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0">
              {radialData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={radialData}
                    innerRadius="30%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    barSize={6}
                  >
                    <RadialBar background dataKey="pct" cornerRadius={4} />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="grid flex-1 gap-1.5">
              {stats.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="font-mono font-medium text-card-foreground">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
