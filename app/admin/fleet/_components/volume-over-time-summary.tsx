import type { FleetOverviewData } from "../types"

import { PercentageChangeBadge } from "@/components/dashboards/percentage-change-badge"

export function VolumeOverTimeSummary({
  data,
}: {
  data: FleetOverviewData
}) {
  return (
    <div className="flex items-baseline gap-x-2">
      <p className="text-3xl font-bold tracking-tight">
        {data.kpi.transportFees.formattedValue}
      </p>
      <PercentageChangeBadge
        variant="ghost"
        value={data.kpi.transportFees.percentageChange}
      />
    </div>
  )
}
