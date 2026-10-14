"use client";

import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderPnLSummary } from "@/lib/fleet/financials";

const SEGMENTS = [
  { key: "cost", label: "Cost", color: "#8b5cf6", dot: "bg-violet-500" },
  { key: "expense", label: "Expenses", color: "#eab308", dot: "bg-amber-500" },
  { key: "profit", label: "Profit", color: "#10b981", dot: "bg-emerald-500" },
] as const;

function formatNaira(value: number) {
  return `₦${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function OrderFinancialSummary({ pnl }: { pnl?: OrderPnLSummary | null }) {
  const cost = pnl ? pnl.totalCogs + pnl.totalLoadingCost : 0;
  const expenses = pnl
    ? pnl.totalTransportFeesPaid + pnl.totalTripExpenses + pnl.totalOrderExpenses
    : 0;
  const netProfit = pnl?.netProfit ?? 0;
  const revenue = pnl?.totalRevenue ?? 0;

  const chartConfig = useMemo(
    () =>
      ({
        cost: { label: "Cost", color: "#8b5cf6" },
        expense: { label: "Expenses", color: "#eab308" },
        profit: { label: "Profit", color: "#10b981" },
      }) satisfies ChartConfig,
    [],
  );

  const chartData = useMemo(() => {
    const rows = [
      { key: "cost", label: "Cost", value: cost },
      { key: "expense", label: "Expenses", value: expenses },
      { key: "profit", label: "Profit", value: Math.max(0, netProfit) },
    ].filter((row) => row.value > 0);

    return rows.map((row) => {
      const meta = SEGMENTS.find((s) => s.key === row.key)!;
      return {
        ...row,
        fill: meta.color,
      };
    });
  }, [cost, expenses, netProfit]);

  const pieTotal = chartData.reduce((sum, row) => sum + row.value, 0);
  const basis = revenue > 0 ? revenue : pieTotal;

  const legendRows = SEGMENTS.map((seg) => {
    const value =
      seg.key === "cost"
        ? cost
        : seg.key === "expense"
          ? expenses
          : netProfit;
    return { ...seg, value };
  });

  if (!pnl) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Financial breakdown unavailable.
      </p>
    );
  }

  if (basis <= 0 && cost <= 0 && expenses <= 0 && netProfit === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No delivery revenue or costs recorded for this order yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px] w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                nameKey="label"
                formatter={(value) => formatNaira(Number(value))}
              />
            }
          />
          <Pie
            data={chartData.length > 0 ? chartData : [{ key: "empty", label: "—", value: 1, fill: "var(--muted)" }]}
            dataKey="value"
            nameKey="label"
            innerRadius={58}
            strokeWidth={4}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 8}
                        className="fill-muted-foreground text-[11px]"
                      >
                        Revenue
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 12}
                        className="fill-foreground text-sm font-semibold"
                      >
                        {formatNaira(revenue)}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-2.5 border-t border-border/40 pt-3">
        {legendRows.map((row) => {
          const pct = basis > 0 ? (Math.abs(row.value) / basis) * 100 : 0;
          const isNegativeProfit = row.key === "profit" && row.value < 0;
          return (
            <div key={row.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("size-2.5 shrink-0 rounded-full", row.dot)} />
                <span className="text-sm font-medium truncate">{row.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "text-sm font-mono font-semibold tabular-nums",
                    isNegativeProfit && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {formatNaira(row.value)}
                </span>
                {basis > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-medium tabular-nums shadow-none">
                    {pct.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
