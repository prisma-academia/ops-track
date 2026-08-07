import { requireTenantPage } from "@/lib/auth/page-guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

import { getFleetOverviewData } from "./_data/fleet-overview"

import { Overview } from "./_components/overview"
import SalesOverviewChart from "@/components/charts/sales-overview"
import EarningReportChart from "@/components/charts/earn-report"
import { TopTransporters } from "./_components/top-transporters"
import { TopClients } from "./_components/top-clients"

export default async function FleetOverviewPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key)
  const data = await getFleetOverviewData(actor.tenantId)

  return (
    <section className="grid gap-3 p-4 md:grid-cols-2 space-y-3">
      <Overview data={data} />
      <div className="col-span-full grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SalesOverviewChart data={data} />
        </div>
        <div>
          <EarningReportChart data={data} />
        </div>
      </div>
      <div className="col-span-full grid gap-4 md:grid-cols-2">
        <TopTransporters data={data} />
        <TopClients data={data} />
      </div>
    </section>
  )
}

