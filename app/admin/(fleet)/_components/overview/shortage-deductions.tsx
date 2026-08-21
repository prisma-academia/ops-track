import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function ShortageDeductions({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.shortageDeductions.formattedValue,
        subtitle: data.kpi.shortageDeductions.subtitle,
        subtitleClassName: data.kpi.shortageDeductions.subtitleClassName,
      }}
      title="Shortage Deductions"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
