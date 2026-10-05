import type { FleetOverviewData } from "../../types"
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function LitresSold({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.litresSold.formattedValue,
        percentageChange: data.kpi.litresSold.percentageChange,
        subtitle: data.kpi.litresSold.subtitle,
        subtitleClassName: data.kpi.litresSold.subtitleClassName,
      }}
      title="Litres Sold"
      icon={DeliveryTruck01Icon}
      period={data.period || "Last 30 days"}
    />
  )
}
