import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { VolumeOverTimeChart } from "@/components/fleet/charts/volume-over-time-chart"
import { VolumeOverTimeSummary } from "./volume-over-time-summary"

export function VolumeOverTime({
  data,
  className,
}: {
  data: FleetOverviewData
  className?: string
}) {
  return (
    <DashboardCard
      title="Volume Over Time"
      period="This Month vs Last Month"
      action={<DashboardCardActionsDropdown />}
      size="default"
      className={className}
    >
      <VolumeOverTimeSummary data={data} />
      <VolumeOverTimeChart data={data.comparativeVolume} />
    </DashboardCard>
  )
}
