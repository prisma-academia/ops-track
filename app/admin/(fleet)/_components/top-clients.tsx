import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { PerformanceList } from "./performance-list"

export function TopClients({ data }: { data: FleetOverviewData }) {
  const mappedData = data.clientPerformance.map((c) => ({
    name: c.name,
    subtitle: `${c.trips} Trips`,
    value: c.volume,
    amount: c.amount,
  }))

  return (
    <DashboardCard
      title="Top Stations / Clients"
      period="By Volume"
      action={<DashboardCardActionsDropdown />}
    >
      <PerformanceList data={mappedData} iconUrl="/assets/icons/gps.png" />
    </DashboardCard>
  )
}
