import type { FleetOverviewData } from "../../types"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function ShortageDeductions({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.shortageDeductions.formattedValue,
        percentageChange: data.kpi.shortageDeductions.percentageChange,
        subtitle: data.kpi.shortageDeductions.subtitle,
        subtitleClassName: data.kpi.shortageDeductions.subtitleClassName,
      }}
      title="Shortage Deductions"
      icon={Alert02Icon}
      period={data.period || "Last 30 days"}
    />
  )
}
