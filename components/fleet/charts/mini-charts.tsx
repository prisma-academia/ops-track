"use client";

import { Area, AreaChart, Bar, BarChart, Line, LineChart, CartesianGrid, XAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type WeeklyDataPoint = {
  label: string;
  value: number;
};

// ── Mini Area Chart (for Volume / Fees) ─────────────────────────────────────
const areaConfig = { value: { label: "Value" } } satisfies ChartConfig;

export function MiniAreaChart({ data, colorVar = "--chart-1" }: { data: WeeklyDataPoint[], colorVar?: string }) {
  return (
    <ChartContainer config={areaConfig} className="h-32 w-full rounded-b-md overflow-hidden">
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis 
          dataKey="label" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={8} 
          hide 
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="value"
          type="natural"
          fill={`hsl(var(${colorVar}))`}
          fillOpacity={0.4}
          stroke={`hsl(var(${colorVar}))`}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Mini Bar Chart (for Transports Count) ───────────────────────────────────
const barConfig = { value: { label: "Count" } } satisfies ChartConfig;

export function MiniBarChart({ data, colorVar = "--chart-2" }: { data: WeeklyDataPoint[], colorVar?: string }) {
  return (
    <ChartContainer config={barConfig} className="h-32 w-full rounded-b-md overflow-hidden">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis 
          dataKey="label" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={8} 
          hide 
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar 
          dataKey="value" 
          fill={`hsl(var(${colorVar}))`} 
          radius={[4, 4, 0, 0]}
          barSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}

// ── Mini Line Chart (for Deductions) ────────────────────────────────────────
const lineConfig = { value: { label: "Value" } } satisfies ChartConfig;

export function MiniLineChart({ data, colorVar = "--chart-3" }: { data: WeeklyDataPoint[], colorVar?: string }) {
  return (
    <ChartContainer config={lineConfig} className="h-32 w-full rounded-b-md overflow-hidden">
      <LineChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis 
          dataKey="label" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={8} 
          hide 
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="value"
          type="monotone"
          stroke={`hsl(var(${colorVar}))`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
