import type { FleetOverviewData } from "../../types"
import { Coins01Icon } from "@hugeicons/core-free-icons"
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card"

export function TransportFees({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.transportFees.formattedValue,
        percentageChange: data.kpi.transportFees.percentageChange,
      }}
      title="Transport Fees Paid"
      icon={Coins01Icon}
      period={data.period || "Last 30 days"}
    />
  )
}
