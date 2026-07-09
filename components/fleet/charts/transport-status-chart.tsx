"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Transports",
  },
  in_transit: {
    label: "In Transit",
    color: "hsl(var(--chart-2))", 
  },
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-1))", 
  },
  loss: {
    label: "Loss",
    color: "hsl(var(--chart-5))", 
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(var(--chart-4))", 
  },
} satisfies ChartConfig;

interface ChartData {
  status: string;
  count: number;
  fill?: string;
}

export function TransportStatusChart({ data }: { data: ChartData[] }) {
  const totalTransports = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  // Map database enum to pretty labels and chart colors
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      return {
        ...item,
        status: item.status.toLowerCase(),
        fill: `var(--color-${item.status.toLowerCase()})`,
      };
    });
  }, [data]);

  if (!data || totalTransports === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No transport data available.
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px] mt-4"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="status"
          innerRadius={60}
          strokeWidth={5}
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
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-bold"
                    >
                      {totalTransports.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground"
                    >
                      Transports
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
