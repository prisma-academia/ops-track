"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import type { ChartConfig } from "@/components/ui/chart"
import type { WeeklyDataPoint } from "../../types"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  value: { label: "Volume (L)" },
} satisfies ChartConfig

export function DeliveredVolumeChart({
  data,
}: {
  data: WeeklyDataPoint[]
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className="h-32 w-full rounded-b-md overflow-hidden"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 0, right: 0 }}
      >
        <CartesianGrid vertical={false} />
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
          fill="hsl(var(--chart-4))"
          fillOpacity={0.4}
          stroke="hsl(var(--chart-4))"
        />
      </AreaChart>
    </ChartContainer>
  )
}
