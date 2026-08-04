"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import type { ChartConfig } from "@/components/ui/chart"
import type { WeeklyDataPoint } from "../../types"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  value: { label: "Deductions" },
} satisfies ChartConfig

export function ShortageDeductionsChart({
  data,
}: {
  data: WeeklyDataPoint[]
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className="h-32 w-full rounded-b-md overflow-hidden"
    >
      <LineChart
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
        <Line
          dataKey="value"
          type="monotone"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
