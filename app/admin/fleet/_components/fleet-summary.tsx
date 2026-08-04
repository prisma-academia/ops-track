import { Building2, Route, Truck, Users } from "lucide-react"

import type { FleetOverviewData } from "../types"

import {
  DashboardCard,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"
import { FleetSummaryItem } from "./fleet-summary-item"

export function FleetSummary({ data }: { data: FleetOverviewData }) {
  return (
    <DashboardCard
      title="Fleet Summary"
      action={<DashboardCardActionsDropdown />}
      size="none"
    >
      <div className="grid grid-cols-2 gap-4">
        <FleetSummaryItem
          icon={Building2}
          label="Transporters"
          value={data.counts.transporters}
        />
        <FleetSummaryItem
          icon={Truck}
          label="Trucks"
          value={data.counts.trucks}
        />
        <FleetSummaryItem
          icon={Users}
          label="Drivers"
          value={data.counts.drivers}
        />
        <FleetSummaryItem
          icon={Route}
          label="Active Transports"
          value={data.counts.activeTransports}
        />
      </div>
    </DashboardCard>
  )
}
