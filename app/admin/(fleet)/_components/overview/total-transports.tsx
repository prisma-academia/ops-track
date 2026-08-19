import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function TotalTransports({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.totalTransports.formattedValue,
        percentageChange: data.kpi.totalTransports.percentageChange,
      }}
      title="Total Transports"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
