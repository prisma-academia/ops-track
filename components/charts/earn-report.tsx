"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { FleetOverviewData } from "@/app/admin/fleet/types";

export default function EarningReportChart({ data }: { data: FleetOverviewData }) {
  const colors = [
    { fill: "var(--color-blue-500)", border: "bg-blue-500" },
    { fill: "var(--color-sky-400)", border: "bg-sky-400" },
    { fill: "rgba(56, 189, 248, 0.5)", border: "bg-sky-400/50" },
    { fill: "rgba(56, 189, 248, 0.2)", border: "bg-sky-400/20" },
  ];

  const chartData = data.productVolume.map((item, index) => ({
    browser: item.productType,
    visitors: item.volume,
    fill: colors[index % colors.length].fill,
  }));

  const chartConfig = data.productVolume.reduce((acc, item, index) => {
    acc[item.productType] = {
      label: item.productType,
      color: colors[index % colors.length].fill,
    };
    return acc;
  }, {
    visitors: { label: "Volume" },
  } as ChartConfig);

  const totalVolume = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, [chartData]);

  const CustomerSegmentation = data.productVolume.map((item, index) => ({
    id: index,
    customer: item.productType,
    borderColor: colors[index % colors.length].border,
    badgeColor: "bg-teal-400/10",
    earning: item.volume,
  }));

  return (
    <Card className="h-full w-full py-6 gap-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h4 className="text-lg font-semibold">Volume by Product</h4>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-2 flex-1 px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-square max-h-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={65}
              strokeWidth={60}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                          className="fill-muted-foreground text-sm"
                        >
                          Total
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-foreground text-lg font-medium"
                        >
                          {totalVolume.toLocaleString()}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col gap-3">
          {CustomerSegmentation.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(item.borderColor, "w-1 h-4 rounded-full")}
                ></div>
                <h6 className={cn("text-sm font-medium leading-tight")}>
                  {item.customer}
                </h6>
              </div>
              <div className="flex items-center gap-1">
                <h6 className="text-sm font-medium">{item.earning.toLocaleString()} L</h6>
                <Badge
                  className={cn(
                    item.badgeColor,
                    "text-muted-foreground",
                    "shadow-none",
                  )}
                >
                  {totalVolume > 0 ? ((item.earning / totalVolume) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
