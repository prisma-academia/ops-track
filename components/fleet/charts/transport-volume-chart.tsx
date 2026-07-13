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
    label: "Volume (Liters)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface ChartData {
  productType: string;
  volume: number;
  fill?: string;
}

export function TransportVolumeChart({ data }: { data: ChartData[] }) {
  // Enhance data with specific colors based on fuel type
  const enhancedData = data.map((item) => {
    let color = "hsl(var(--chart-1))";
    if (item.productType === "PMS") color = "#0f172a"; // Dark Slate / Black
    if (item.productType === "AGO") color = "hsl(var(--chart-2))"; // Orange or amber
    if (item.productType === "DPK") color = "hsl(var(--chart-3))"; // Purple or cyan
    if (item.productType === "LPG") color = "hsl(var(--chart-4))"; 
    
    return {
      ...item,
      fill: color,
    };
  });

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No volume data available.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full mt-4">
      <BarChart accessibilityLayer data={enhancedData} margin={{ top: 20, left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="productType"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => 
            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
          }
          width={50}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="volume" radius={8}>
          <LabelList
            dataKey="volume"
            position="top"
            offset={12}
            className="fill-foreground"
            fontSize={12}
            formatter={(value) => Number(value).toLocaleString()}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
