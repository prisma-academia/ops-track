import type { FleetOverviewData } from "../../types"

import { DeliveredVolume } from "./delivered-volume"
import { ShortageDeductions } from "./shortage-deductions"
import { TotalTransports } from "./total-transports"
import { TransportFees } from "./transport-fees"

export function Overview({ data }: { data: FleetOverviewData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-full md:grid-cols-4">
      <TransportFees data={data} />
      <TotalTransports data={data} />
      <ShortageDeductions data={data} />
      <DeliveredVolume data={data} />
    </div>
  )
}
