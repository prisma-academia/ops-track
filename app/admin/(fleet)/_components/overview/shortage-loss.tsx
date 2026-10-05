import type { FleetOverviewData } from "../../types"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function ShortageLoss({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.shortage.formattedValue,
        percentageChange: data.kpi.shortage.percentageChange,
        subtitle: data.kpi.shortage.subtitle,
        subtitleClassName: data.kpi.shortage.subtitleClassName,
      }}
      title="Shortage & Loss"
      icon={Alert02Icon}
      period={data.period || "Last 30 days"}
    />
  )
}
