"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { FleetOverviewData } from "@/app/admin/fleet/types";

const chartConfig = {
  expense: {
    label: "Expense",
    color: "var(--color-blue-500)",
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
  const chartData = data.kpi.transportFees.weeklyTrend.map((trend, index) => {
    const earning = trend.value;
    const expense = data.kpi.shortageDeductions.weeklyTrend[index]?.value || 0;
    const profit = earning - expense;
    return {
      name: trend.label,
      expense,
      profit,
      earning,
    };
  });

  const categories = [
    {
      id: 1,
      title: "Revenue",
      color: "bg-sky-400/50",
    },
    {
      id: 2,
      title: "Profit",
      color: "bg-sky-400",
    },
    {
      id: 3,
      title: "Loss / Expense",
      color: "bg-blue-500",
    },
  ];

  const totalRevenue = data.kpi.transportFees.formattedValue;
  const percentage = (data.kpi.transportFees.percentageChange * 100).toFixed(1);
  const isPositive = data.kpi.transportFees.percentageChange >= 0;

  return (
    <Card className="w-full h-full py-6 gap-6">
      <CardHeader className="flex sm:flex-row flex-col justify-between sm:items-center items-start gap-3 px-6">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-medium">Sales Overview</CardTitle>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-card-foreground">
              {totalRevenue}
            </h3>
            {/* <Badge
              className={cn(isPositive ? "bg-teal-400/10 text-teal-600" : "bg-red-400/10 text-red-600", "shadow-none")}
            >
              {isPositive ? "+" : ""}{percentage}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              vs last month
            </span> */}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {categories.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
              <p className="text-sm text-muted-foreground">{item.title}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
              tickFormatter={(value) => `₦${(value / 1000)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="expense"
              stackId="a"
              fill="var(--color-expense)"
              radius={[0, 0, 4, 4]}
              barSize={20}
            />
            <Bar
              dataKey="profit"
              stackId="a"
              fill="var(--color-profit)"
              radius={[0, 0, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="earning"
              stackId="a"
              fill="var(--color-earning)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
