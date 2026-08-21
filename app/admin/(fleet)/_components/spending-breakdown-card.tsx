"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatShortCurrency } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import type { SpendingBreakdownPoint } from "../types";

const BAR_COLORS = [
  "#10b981",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
];

const INDICATOR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
];

function formatFullCurrency(value: number) {
  return `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SpendingBreakdownCard({
  segments,
  periodLabel,
}: {
  segments: SpendingBreakdownPoint[];
  periodLabel: string;
}) {
  const total = segments.reduce((sum, item) => sum + item.amount, 0);
  const chartData = segments.map((item, index) => ({
    ...item,
    fill: BAR_COLORS[index % BAR_COLORS.length],
  }));

  const chartConfig = segments.reduce((acc, item, index) => {
    acc[item.label] = {
      label: item.label,
      color: BAR_COLORS[index % BAR_COLORS.length],
    };
    return acc;
  }, { amount: { label: "Amount" } } as ChartConfig);

  return (
    <Card className="h-full border-border/40 shadow-xs py-0 gap-0">
      <CardHeader className="border-b border-border/40 px-6 py-4">
        <CardTitle className="text-base font-semibold">Spending Overview</CardTitle>
        <CardDescription>Where money is mostly spending · {periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
        {segments.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No spending recorded for this period.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total spent</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-1 text-xl font-semibold tabular-nums cursor-default">
                    {formatShortCurrency(total)}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                  {formatFullCurrency(total)}
                </TooltipContent>
              </Tooltip>
            </div>

            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(144, 164, 174, 0.3)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={0}
                  tickFormatter={(value: string) =>
                    value.length > 10 ? `${value.slice(0, 10)}…` : value
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  tickFormatter={(value: number) => formatShortCurrency(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={28}>
                  {chartData.map((item) => (
                    <Cell key={item.label} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="space-y-2.5">
              {segments.map((item, index) => {
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          INDICATOR_COLORS[index % INDICATOR_COLORS.length]
                        )}
                      />
                      <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="shrink-0 text-sm font-semibold tabular-nums cursor-default">
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
