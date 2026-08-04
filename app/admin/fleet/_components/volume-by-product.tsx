import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { TransportVolumeChart } from "@/components/fleet/charts/transport-volume-chart"

export function VolumeByProduct({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardCard
      title="Volume by Product"
      action={<DashboardCardActionsDropdown />}
      className="h-full flex flex-col"
      contentClassName="flex-1 mt-auto"
    >
      <TransportVolumeChart data={data.productVolume} />
    </DashboardCard>
  )
}
