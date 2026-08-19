import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function TransportFees({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.transportFees.formattedValue,
        percentageChange: data.kpi.transportFees.percentageChange,
      }}
      title="Transport Fees Paid"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
