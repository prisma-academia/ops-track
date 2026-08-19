import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function DeliveredVolume({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.deliveredVolume.formattedValue,
        percentageChange: data.kpi.deliveredVolume.percentageChange,
      }}
      title="Delivered Volume (L)"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
