import type { FleetOverviewData } from "../../types"
import { Invoice01Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function OutstandingSales({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.outstandingSales.formattedValue,
        subtitle: data.kpi.outstandingSales.subtitle,
        subtitleClassName: data.kpi.outstandingSales.subtitleClassName,
      }}
      title="Outstanding Sales"
      icon={Invoice01Icon}
      period="All-time balance"
    />
  )
}
