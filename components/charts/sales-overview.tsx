"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatShortCurrency } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { FleetOverviewData } from "@/app/admin/(fleet)/types";

const formatYAxisNumber = (value: number) => formatShortCurrency(value);

const formatFullCurrency = (value: number) => {
  return `₦${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const chartConfig = {
  expense: {
    label: "Expense",
    color: "var(--color-blue-500)",
  },
  loss: {
    label: "Loss",
    color: "#ef4444",
  },
  profit: {
    label: "Profit",
    color: "var(--color-sky-400)",
  },
  earning: {
    label: "Revenue",
    color: "rgba(56, 189, 248, 0.5)",
  },
} satisfies ChartConfig;

export interface SalesOverviewChartPoint {
  name: string;
  earning: number;
  expense: number;
  loss?: number;
}

export interface SalesOverviewChartCardProps {
  title?: string;
  chartData: SalesOverviewChartPoint[];
  revenue?: number;
  expense?: number;
  profit?: number;
  loss?: number;
  /** @deprecated Prefer numeric `revenue`. Kept for station dashboard compatibility. */
  revenueValue?: string;
  /** @deprecated Prefer numeric `expense`. Kept for station dashboard compatibility. */
  expenseValue?: string;
}

/**
 * Generic "Sales Overview" card: 4 highlight tiles (Revenue/Profit/Loss/Expense)
 * above a stacked bar chart. Shared between the Fleet and Station dashboards so
 * both surfaces get the same look & feel for revenue vs. expense trends.
 */
export function SalesOverviewChartCard({
  title = "Sales Overview",
  chartData,
  revenue,
  expense,
  profit,
  loss,
}: SalesOverviewChartCardProps) {
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);

  const stackedData = chartData.map((point) => ({
    name: point.name,
    earning: point.earning,
    expense: point.expense,
    loss: point.loss ?? 0,
    profit: point.earning - point.expense - (point.loss ?? 0),
  }));

  const totalRevenueVal =
    revenue ?? stackedData.reduce((acc, curr) => acc + curr.earning, 0);
  const totalExpenseVal =
    expense ?? stackedData.reduce((acc, curr) => acc + curr.expense, 0);
  const totalLossVal =
    loss ?? stackedData.reduce((acc, curr) => acc + curr.loss, 0);
  const totalProfitVal =
    profit ?? totalRevenueVal - totalExpenseVal - totalLossVal;

  const categories = [
    {
      key: "earning",
      title: "Revenue",
      value: totalRevenueVal,
      dotColor: "bg-sky-400/50",
      activeBorder: "border-sky-400/60 ring-sky-400/30",
    },
    {
      key: "profit",
      title: "Profit",
      value: totalProfitVal,
      dotColor: "bg-sky-400",
      activeBorder: "border-sky-400 ring-sky-400/30",
    },
    {
      key: "loss",
      title: "Loss",
      value: totalLossVal,
      dotColor: "bg-red-500",
      activeBorder: "border-red-500 ring-red-500/30",
    },
    {
      key: "expense",
      title: "Expense",
      value: totalExpenseVal,
      dotColor: "bg-blue-500",
      activeBorder: "border-blue-500 ring-blue-500/30",
    },
  ];

  return (
    <Card className="w-full h-full py-6 gap-6">
      <CardHeader className="flex flex-col gap-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {categories.map((cat) => {
            const isHovered = hoveredCategory === cat.key;
            return (
              <Tooltip key={cat.key}>
                <TooltipTrigger asChild>
                  <div
                    onMouseEnter={() => setHoveredCategory(cat.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={cn(
                      "relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none",
                      isHovered
                        ? cn("bg-accent/60 shadow-md ring-2 scale-[1.02]", cat.activeBorder)
                        : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {cat.title}
                      </span>
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cat.dotColor)} />
                    </div>
                    <div className="mt-2 text-sm sm:text-base font-bold text-foreground tracking-tight">
                      {formatShortCurrency(cat.value)}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                  {formatFullCurrency(cat.value)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart accessibilityLayer data={stackedData}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgba(144, 164, 174, 0.3)"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              tickFormatter={formatYAxisNumber}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="expense"
              stackId="a"
              fill="var(--color-expense)"
              radius={[0, 0, 4, 4]}
              barSize={20}
              opacity={
                hoveredCategory === null || hoveredCategory === "expense"
                  ? 1
                  : 0.15
              }
            />
            <Bar
              dataKey="loss"
              stackId="a"
              fill="var(--color-loss)"
              radius={[0, 0, 0, 0]}
              barSize={20}
              opacity={hoveredCategory === null || hoveredCategory === "loss" ? 1 : 0.15}
            />
            <Bar
              dataKey="profit"
              stackId="a"
              fill="var(--color-profit)"
              radius={[0, 0, 0, 0]}
              barSize={20}
              opacity={hoveredCategory === null || hoveredCategory === "profit" ? 1 : 0.15}
            />
            <Bar
              dataKey="earning"
              stackId="a"
              fill="var(--color-earning)"
              radius={[4, 4, 0, 0]}
              barSize={20}
              opacity={hoveredCategory === null || hoveredCategory === "earning" ? 1 : 0.15}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function SalesOverviewChart({ data }: { data: FleetOverviewData }) {
  return (
    <SalesOverviewChartCard
      chartData={data.salesOverview.points}
      revenue={data.salesOverview.revenue}
      expense={data.salesOverview.expense}
      loss={data.salesOverview.loss}
      profit={data.salesOverview.profit}
    />
  );
}
