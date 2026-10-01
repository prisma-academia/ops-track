import type { FleetOverviewData } from "../../types"
import { DropletIcon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function TotalTransports({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.totalLitresOrdered.formattedValue,
        percentageChange: data.kpi.totalLitresOrdered.percentageChange,
      }}
      title="Total Litres Ordered"
      icon={DropletIcon}
      period={data.period || "Last 30 days"}
    />
  )
}
