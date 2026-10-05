import type { FleetOverviewData } from "../../types"
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function DeliveredVolume({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.deliveredVolume.formattedValue,
        percentageChange: data.kpi.deliveredVolume.percentageChange,
        subtitle: data.kpi.deliveredVolume.subtitle,
        subtitleClassName: data.kpi.deliveredVolume.subtitleClassName,
      }}
      title="Delivered Volume (L)"
      icon={DeliveryTruck01Icon}
      period={data.period || "Last 30 days"}
    />
  )
}
