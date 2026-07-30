"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  thisMonth: {
    label: "This Month",
    color: "#18181b", 
  },
  lastMonth: {
    label: "Last Month",
    color: "#a1a1aa", 
  },
} satisfies ChartConfig;

interface ChartData {
  name: string;
  thisMonth: number;
  lastMonth: number;
}

export function VolumeOverTimeChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">No data available.</div>;
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <BarChart data={data} margin={{ top: 20, left: 0, right: 10, bottom: 0 }} barGap={8} barCategoryGap="25%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={12} 
          className="text-xs font-medium text-muted-foreground"
        />
        <YAxis 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
          width={40} 
          className="text-xs font-medium text-muted-foreground"
        />
        <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
        <Bar dataKey="thisMonth" name="This Month" fill="var(--color-thisMonth)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="lastMonth" name="Last Month" fill="var(--color-lastMonth)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
