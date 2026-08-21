import { requireTenantPage } from "@/lib/auth/page-guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { parseOverviewPeriod } from "@/lib/overview-period"

import { getFleetOverviewData } from "./_data/fleet-overview"

import { Overview } from "./_components/overview"
import SalesOverviewChart from "@/components/charts/sales-overview"
import EarningReportChart from "@/components/charts/earn-report"
import { PerformersSection } from "./_components/performers-section"

export default async function FleetOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: periodParam } = await searchParams
  const period = parseOverviewPeriod(periodParam)

  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key, "FLEET")
  const data = await getFleetOverviewData(actor.tenantId, period)

  return (
    <section className="grid gap-3 md:grid-cols-2 space-y-3">
      <Overview data={data} />
      <div className="col-span-full grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SalesOverviewChart data={data} />
        </div>
        <div>
          <EarningReportChart data={data} />
        </div>
      </div>
      <div className="col-span-full">
        <PerformersSection data={data} period={period} />
      </div>
    </section>
  )
}
