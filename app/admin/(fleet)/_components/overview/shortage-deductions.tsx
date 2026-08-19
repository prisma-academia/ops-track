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
        percentageChange: data.kpi.shortageDeductions.percentageChange,
      }}
      title="Shortage Deductions"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
