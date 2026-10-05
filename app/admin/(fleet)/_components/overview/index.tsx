import type { FleetOverviewData } from "../../types"

import { LitersOrdered } from "./liters-ordered"
import { LitresSold } from "./litres-sold"
import { ShortageLoss } from "./shortage-loss"
import { OutstandingSales } from "./outstanding-sales"
import { OutstandingFleet } from "./outstanding-fleet"

export function Overview({ data }: { data: FleetOverviewData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:col-span-full">
      <LitersOrdered data={data} />
      <LitresSold data={data} />
      <ShortageLoss data={data} />
      <OutstandingSales data={data} />
      <OutstandingFleet data={data} />
    </div>
  )
}
