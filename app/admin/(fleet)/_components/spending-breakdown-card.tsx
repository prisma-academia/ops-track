"use client";

import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatShortCurrency } from "@/lib/utils";
import type { SpendingBreakdownPoint } from "../types";

function formatFullCurrency(value: number) {
  return `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function segmentKey(index: number) {
  return `segment-${index}`;
}

export function SpendingBreakdownCard({
  segments,
}: {
  segments: SpendingBreakdownPoint[];
}) {
  const total = segments.reduce((sum, item) => sum + item.amount, 0);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      amount: { label: "Amount" },
    };
    segments.forEach((item, index) => {
      const key = segmentKey(index);
      config[key] = {
        label: item.label,
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });
    return config;
  }, [segments]);

  const chartData = useMemo(
    () =>
      segments.map((item, index) => {
        const key = segmentKey(index);
        return {
          key,
          label: item.label,
          amount: item.amount,
          fill: `var(--color-${key})`,
        };
      }),
    [segments],
  );

  return (
    <Card className="h-full border-border/40 shadow-xs py-0 gap-0">
      <CardHeader className="border-b border-border/40 px-6 py-4">
        <CardTitle className="text-base font-semibold">Spending Overview</CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-5">
        {segments.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No spending recorded for this period.
          </div>
        ) : (
          <div className="space-y-5">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[260px] w-full [&_.recharts-text]:fill-background"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      formatter={(value) => formatFullCurrency(Number(value))}
                    />
                  }
                />
                <Pie data={chartData} dataKey="amount" nameKey="label">
                  <LabelList
                    dataKey="label"
                    className="fill-background"
                    stroke="none"
                    fontSize={11}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="label" />} />
              </PieChart>
            </ChartContainer>

            <div className="space-y-2 border-t border-border/40 pt-3">
              {segments.map((item, index) => {
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-foreground">{item.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="shrink-0 font-semibold tabular-nums cursor-default">
                          {formatShortCurrency(item.amount)}
                          <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                            {pct.toFixed(1)}%
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                        {formatFullCurrency(item.amount)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
