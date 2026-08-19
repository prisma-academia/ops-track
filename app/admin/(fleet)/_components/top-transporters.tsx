import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { PerformanceList } from "./performance-list"

export function TopTransporters({ data }: { data: FleetOverviewData }) {
  const mappedData = data.transporterPerformance.map((t) => ({
    name: t.transporter,
    subtitle: `${t.trips} Trips`,
    value: t.volume,
    amount: t.amount,
  }))

  return (
    <DashboardCard
      title="Top Transporters"
      period="By Volume"
      action={<DashboardCardActionsDropdown />}
    >
      <PerformanceList data={mappedData} iconUrl="/assets/icons/gas-truck.png" />
    </DashboardCard>
  )
}
