"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  quantity: {
    label: "Lost (Liters)",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--chart-5))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-2))", 
];

interface ChartData {
  lossType: string;
  quantity: number;
}

export function LossAnalysisChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">No losses reported!</div>;
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="quantity"
          nameKey="lossType"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
