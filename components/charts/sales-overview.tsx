"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { FleetOverviewData } from "@/app/admin/fleet/types";

const formatYAxisNumber = (value: number) => {
  if (value >= 1_000_000_000) {
    return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (value >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `₦${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₦${value}`;
};

const formatCurrencyValue = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) {
    return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `₦${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₦${value.toLocaleString()}`;
};

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

export default function SalesOverviewChart({ data }: { data: FleetOverviewData }) {
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);

  const chartData = data.kpi.transportFees.weeklyTrend.map((trend, index) => {
    const earning = trend.value;
    const expense = data.kpi.shortageDeductions.weeklyTrend[index]?.value || 0;
    const loss = expense;
    const profit = earning - expense;
    return {
      name: trend.label,
      expense,
      loss,
      profit,
      earning,
    };
  });

  const totalRevenueVal = chartData.reduce((acc, curr) => acc + curr.earning, 0);
  const totalExpenseVal = chartData.reduce((acc, curr) => acc + curr.expense, 0);
  const totalLossVal = totalExpenseVal;
  const totalProfitVal = totalRevenueVal - totalExpenseVal;

  const categories = [
    {
      key: "earning",
      title: "Revenue",
      value: data.kpi.transportFees.formattedValue || formatCurrencyValue(totalRevenueVal),
      fullValue: formatFullCurrency(totalRevenueVal),
      dotColor: "bg-sky-400/50",
      activeBorder: "border-sky-400/60 ring-sky-400/30",
    },
    {
      key: "profit",
      title: "Profit",
      value: formatCurrencyValue(totalProfitVal),
      fullValue: formatFullCurrency(totalProfitVal),
      dotColor: "bg-sky-400",
      activeBorder: "border-sky-400 ring-sky-400/30",
    },
    {
      key: "loss",
      title: "Loss",
      value: data.kpi.shortageDeductions.formattedValue || formatCurrencyValue(totalLossVal),
      fullValue: formatFullCurrency(totalLossVal),
      dotColor: "bg-red-500",
      activeBorder: "border-red-500 ring-red-500/30",
    },
    {
      key: "expense",
      title: "Expense",
      value: data.kpi.shortageDeductions.formattedValue || formatCurrencyValue(totalExpenseVal),
      fullValue: formatFullCurrency(totalExpenseVal),
      dotColor: "bg-blue-500",
      activeBorder: "border-blue-500 ring-blue-500/30",
    },
  ];

  return (
    <Card className="w-full h-full py-6 gap-6">
      <CardHeader className="flex flex-col gap-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Sales Overview</CardTitle>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {categories.map((cat) => {
            const isHovered = hoveredCategory === cat.key;
            return (
              <div
                key={cat.key}
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
                <div className="mt-2 text-sm sm:text-base font-bold text-foreground tracking-tight transition-all">
                  {isHovered ? cat.fullValue : cat.value}
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart accessibilityLayer data={chartData}>
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
              fill={hoveredCategory === "loss" ? "#ef4444" : "var(--color-expense)"}
              radius={[0, 0, 4, 4]}
              barSize={20}
              opacity={
                hoveredCategory === null || hoveredCategory === "expense" || hoveredCategory === "loss"
                  ? 1
                  : 0.15
              }
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


