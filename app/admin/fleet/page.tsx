import { requireTenantPage } from "@/lib/auth/page-guards"

import { getFleetOverviewData } from "./_data/fleet-overview"

import { Overview } from "./_components/overview"
import { VolumeByProduct } from "./_components/volume-by-product"
import { VolumeOverTime } from "./_components/volume-over-time"

export default async function FleetOverviewPage() {
  const actor = await requireTenantPage()
  const data = await getFleetOverviewData(actor.tenantId)

  return (
    <section className="grid gap-4 p-4 md:grid-cols-2">
      <Overview data={data} />
      <div className="col-span-full grid gap-4 md:grid-cols-3">
        <VolumeOverTime data={data} className="md:col-span-2" />
        <VolumeByProduct data={data} />
      </div>
    </section>
  )
}

