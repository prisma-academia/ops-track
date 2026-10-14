import type { FleetOverviewData } from "../types"
import { TopPerformers } from "./top-performers"
import { SpendingBreakdownCard } from "./spending-breakdown-card"

export function PerformersSection({ data }: { data: FleetOverviewData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TopPerformers data={data} />
      </div>
      <div className="lg:col-span-1">
        <SpendingBreakdownCard segments={data.spendingBreakdown} />
      </div>
    </div>
  )
}
