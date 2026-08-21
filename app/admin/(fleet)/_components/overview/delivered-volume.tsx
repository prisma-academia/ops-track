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
        subtitle: data.kpi.deliveredVolume.subtitle,
        subtitleClassName: data.kpi.deliveredVolume.subtitleClassName,
      }}
      title="Delivered Volume (L)"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
