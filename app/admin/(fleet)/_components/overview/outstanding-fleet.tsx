import type { FleetOverviewData } from "../../types"
import { TruckDeliveryIcon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function OutstandingFleet({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.outstandingFleet.formattedValue,
        subtitle: data.kpi.outstandingFleet.subtitle,
        subtitleClassName: data.kpi.outstandingFleet.subtitleClassName,
      }}
      title="Outstanding Fleet"
      icon={TruckDeliveryIcon}
      period="All-time balance"
    />
  )
}
