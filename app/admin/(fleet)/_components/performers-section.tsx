import { Suspense } from "react"
import type { FleetOverviewData } from "../types"
import { parseOverviewPeriod } from "@/lib/overview-period"
import { OverviewPeriodSelect } from "./overview-period-select"
import { TopPerformers } from "./top-performers"
import { SpendingBreakdownCard } from "./spending-breakdown-card"

export function PerformersSection({
  data,
  period,
}: {
  data: FleetOverviewData
  period: string
}) {
  const parsedPeriod = parseOverviewPeriod(period)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Performance & Spending</h2>
          <p className="text-sm text-muted-foreground">
            Rankings and outflow breakdown for {data.period}
          </p>
        </div>
        <Suspense fallback={<div className="h-9 w-[160px] rounded-md border bg-muted/40" />}>
          <OverviewPeriodSelect value={parsedPeriod} />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopPerformers data={data} />
        </div>
        <div className="lg:col-span-1">
          <SpendingBreakdownCard
            segments={data.spendingBreakdown}
            periodLabel={data.period}
          />
        </div>
      </div>
    </div>
  )
}
