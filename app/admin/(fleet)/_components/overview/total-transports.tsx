import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function TotalTransports({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.totalLitresOrdered.formattedValue,
        percentageChange: data.kpi.totalLitresOrdered.percentageChange,
      }}
      title="Total Litres Ordered"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
