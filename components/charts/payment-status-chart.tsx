"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import type { FleetOverviewData } from "@/app/admin/fleet/types";

const chartConfig = {
  payment: {
    label: "Payment",
  },
  fullPayment: {
    label: "Full Payment",
    color: "var(--color-teal-500)",
  },
  balance: {
    label: "Balance",
    color: "var(--color-sky-400)",
  },
  debt: {
    label: "Debt",
    color: "var(--color-red-400)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

const defaultChartData = [
  { name: "Full Payment", value: 0, fill: "var(--color-teal-500)" },
  { name: "Balance", value: 0, fill: "var(--color-sky-400)" },
  { name: "Debt", value: 0, fill: "var(--color-red-400)" },
];

export default function PaymentStatusChart({ data }: { data?: FleetOverviewData }) {
  const formatXAxisNumber = (value: number) => {
    if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `₦${value.toLocaleString()}`;
  };

  const chartData = data?.paymentStatus && data.paymentStatus.length > 0
    ? data.paymentStatus.map((item) => {
        let fill = "var(--color-teal-500)";
        if (item.name === "Balance") fill = "var(--color-sky-400)";
        if (item.name === "Debt") fill = "var(--color-red-400)";
        return {
          name: item.name,
          value: item.value,
          fill,
        };
      })
    : defaultChartData;

  const fullPaymentVal = chartData.find((d) => d.name === "Full Payment")?.value || 0;
  const balanceVal = chartData.find((d) => d.name === "Balance")?.value || 0;
  const debtVal = chartData.find((d) => d.name === "Debt")?.value || 0;

  return (
    <Card className="w-full h-full py-6 gap-6">
      <CardHeader className="px-6">
        <CardTitle className="text-lg font-medium">Payment Status</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ right: 20 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(144, 164, 174, 0.3)" />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={6}
              axisLine={false}
              hide
            />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="value" radius={4} barSize={60}>
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-[--color-label]"
                fontSize={12}
              />
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(val: any) => formatXAxisNumber(Number(val || 0))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3 px-6 pb-6 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-teal-500" />
          <span className="text-xs text-muted-foreground">
            Full Payment: <span className="font-semibold text-foreground">{formatXAxisNumber(fullPaymentVal)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-sky-400" />
          <span className="text-xs text-muted-foreground">
            Balance: <span className="font-semibold text-foreground">{formatXAxisNumber(balanceVal)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-xs text-muted-foreground">
            Debt: <span className="font-semibold text-foreground">{formatXAxisNumber(debtVal)}</span>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
