"use client";

import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
import { cn } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  volume: { label: "Volume" }
} satisfies ChartConfig;

const COLORS: Record<string, string> = {
  PMS: "#18181b", // zinc-900 (black)
  AGO: "#71717a", // zinc-500
  DPK: "#a1a1aa", // zinc-400
  LPG: "#d4d4d8", // zinc-300
};

interface ChartData {
  productType: string;
  volume: number;
}

export function TransportVolumeChart({ data }: { data: ChartData[] }) {
  const totalVolume = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.volume, 0);
  }, [data]);

  if (!data || totalVolume === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
        No volume data available.
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    fill: COLORS[item.productType] || "#e4e4e7",
    percentage: ((item.volume / totalVolume) * 100).toFixed(0),
  }));

  return (
    <div className="flex items-center justify-between w-full mt-2">
      {/* Donut Chart (Left Side) */}
      <div className="w-[120px] h-[120px] relative">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="volume"
              nameKey="productType"
              innerRadius={35}
              outerRadius={55}
              stroke="none"
              paddingAngle={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Inner Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[13px] font-bold font-mono tracking-tight leading-none text-foreground">
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(0)}K` : totalVolume}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground mt-0.5 leading-none">Total</span>
        </div>
      </div>

      {/* Legend List (Right Side) */}
      <div className="flex-1 flex flex-col gap-2 pl-4">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="font-medium text-muted-foreground">{item.productType}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold font-mono text-foreground">
                {item.volume >= 1000 ? `${(item.volume / 1000).toFixed(0)}K` : item.volume}
              </span>
              <span className="text-muted-foreground w-6 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
