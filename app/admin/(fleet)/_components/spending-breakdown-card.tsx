"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SpendingBreakdownPoint } from "../types";

const BAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
];

function formatFullCurrency(value: number) {
  return `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SpendingBreakdownCard({
  segments,
  periodLabel,
}: {
  segments: SpendingBreakdownPoint[];
  periodLabel: string;
}) {
  const total = segments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="h-full border-border/40 shadow-xs py-0 gap-0">
      <CardHeader className="border-b border-border/40 px-6 py-4">
        <CardTitle className="text-base font-semibold">Spending Overview</CardTitle>
        <CardDescription>Where money is mostly spending · {periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
        {segments.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No spending recorded for this period.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total spent</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatFullCurrency(total)}</p>
            </div>

            <div className="space-y-4">
              {segments.map((item, index) => {
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatFullCurrency(item.amount)}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-2 bg-muted"
                      indicatorClassName={cn(BAR_COLORS[index % BAR_COLORS.length])}
                    />
                    <p className="text-[11px] text-muted-foreground">{pct.toFixed(1)}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
