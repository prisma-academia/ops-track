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
import type { FleetOverviewData } from "@/app/admin/(fleet)/types";

const SEGMENT_COLORS = [
  { fill: "var(--color-blue-500)", border: "bg-blue-500" },
  { fill: "var(--color-sky-400)", border: "bg-sky-400" },
  { fill: "rgba(56, 189, 248, 0.5)", border: "bg-sky-400/50" },
  { fill: "rgba(56, 189, 248, 0.2)", border: "bg-sky-400/20" },
];

export interface SegmentBreakdownPoint {
  label: string;
  value: number;
}

export interface SegmentBreakdownChartCardProps {
  title?: string;
  segments: SegmentBreakdownPoint[];
  /** Unit suffix shown next to each segment's value, e.g. "L" */
  unitSuffix?: string;
}

/**
 * Generic donut breakdown card: total in the center, segment list with
 * percentage badges below. Shared between the Fleet and Station dashboards.
 */
export function SegmentBreakdownChartCard({
  title = "Breakdown",
  segments,
  unitSuffix = "",
}: SegmentBreakdownChartCardProps) {
  const chartData = segments.map((item, index) => ({
    browser: item.label,
    visitors: item.value,
    fill: SEGMENT_COLORS[index % SEGMENT_COLORS.length].fill,
  }));

  const chartConfig = segments.reduce((acc, item, index) => {
    acc[item.label] = {
      label: item.label,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length].fill,
    };
    return acc;
  }, {
    visitors: { label: "Total" },
  } as ChartConfig);

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, [chartData]);

  const breakdown = segments.map((item, index) => ({
    id: index,
    label: item.label,
    borderColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length].border,
    value: item.value,
  }));

  return (
    <Card className="h-full w-full py-6 gap-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h4 className="text-lg font-semibold">{title}</h4>
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
                          {total.toLocaleString()}
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
          {breakdown.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(item.borderColor, "w-1 h-4 rounded-full")}
                ></div>
                <h6 className={cn("text-sm font-medium leading-tight")}>
                  {item.label}
                </h6>
              </div>
              <div className="flex items-center gap-1">
                <h6 className="text-sm font-medium">
                  {item.value.toLocaleString()}{unitSuffix ? ` ${unitSuffix}` : ""}
                </h6>
                <Badge
                  className={cn(
                    "bg-teal-400/10",
                    "text-muted-foreground",
                    "shadow-none",
                  )}
                >
                  {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EarningReportChart({ data }: { data: FleetOverviewData }) {
  const segments: SegmentBreakdownPoint[] = data.productVolume.map((item) => ({
    label: item.productType,
    value: item.volume,
  }));

  return (
    <SegmentBreakdownChartCard
      title="Volume by Product"
      segments={segments}
      unitSuffix="L"
    />
  );
}
