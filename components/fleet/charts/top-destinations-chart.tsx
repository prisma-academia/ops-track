"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  volume: {
    label: "Volume (L)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface ChartData {
  destination: string;
  volume: number;
}

export function TopDestinationsChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">No data available.</div>;
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <BarChart layout="vertical" data={data} margin={{ top: 0, left: 0, right: 30, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="destination" type="category" tickLine={false} axisLine={false} width={80} tickMargin={10} className="text-xs" />
        <XAxis type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="volume" fill="var(--color-volume)" radius={[0, 4, 4, 0]}>
          <LabelList dataKey="volume" position="right" formatter={(v: number) => `${(v/1000).toFixed(1)}k`} className="fill-foreground text-[10px]" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
