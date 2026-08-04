import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { TransporterPerformanceChart } from "@/components/fleet/charts/transporter-performance-chart"

export function TopTransporters({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardCard
      title="Top Transporters by Volume"
      action={<DashboardCardActionsDropdown />}
    >
      <TransporterPerformanceChart data={data.transporterPerformance} />
    </DashboardCard>
  )
}
