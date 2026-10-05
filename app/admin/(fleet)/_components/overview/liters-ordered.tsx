import type { FleetOverviewData } from "../../types"
import { DropletIcon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function LitersOrdered({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.litersOrdered.formattedValue,
        percentageChange: data.kpi.litersOrdered.percentageChange,
        subtitle: data.kpi.litersOrdered.subtitle,
        subtitleClassName: data.kpi.litersOrdered.subtitleClassName,
      }}
      title="Litres Ordered"
      icon={DropletIcon}
      period={data.period || "Last 30 days"}
    />
  )
}
