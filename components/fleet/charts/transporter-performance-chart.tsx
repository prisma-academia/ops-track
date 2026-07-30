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
    color: "hsl(var(--chart-2))",
  },
  trips: {
    label: "Trips",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig;

interface ChartData {
  transporter: string;
  volume: number;
  trips: number;
}

export function TransporterPerformanceChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">No data available.</div>;
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <BarChart data={data} margin={{ top: 15, left: 0, right: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="transporter" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 10) + (value.length > 10 ? '...' : '')} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={35} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
        <Bar dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
