import type { FleetOverviewData } from "../../types"
import { FleetStatGroupCard } from "./fleet-stat-group-card"

export function Overview({ data }: { data: FleetOverviewData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:col-span-full">
      {data.statGroups.map((group) => (
        <FleetStatGroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
