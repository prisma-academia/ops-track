import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { TransportStatusChart } from "@/components/fleet/charts/transport-status-chart"

export function TransportStatus({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardCard
      title="Transport Status"
      action={<DashboardCardActionsDropdown />}
      size="sm"
    >
      <TransportStatusChart data={data.transportStatus} />
    </DashboardCard>
  )
}
