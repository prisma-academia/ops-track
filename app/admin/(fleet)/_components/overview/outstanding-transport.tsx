import type { FleetOverviewData } from "../../types"
import { TruckDeliveryIcon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function OutstandingTransport({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.outstandingTransport.formattedValue,
        subtitle: data.kpi.outstandingTransport.subtitle,
        subtitleClassName: data.kpi.outstandingTransport.subtitleClassName,
      }}
      title="Outstanding Transport"
      icon={TruckDeliveryIcon}
      period="All-time balance"
    />
  )
}
