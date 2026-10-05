import { requireTenantPage } from "@/lib/auth/page-guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { parseOverviewPeriod } from "@/lib/overview-period"
import { prisma } from "@/lib/db/client"
import { format } from "date-fns"

import { getFleetOverviewData } from "../_data/fleet-overview"

import { Overview } from "../_components/overview"
import SalesOverviewChart from "@/components/charts/sales-overview"
import EarningReportChart from "@/components/charts/earn-report"
import { PerformersSection } from "../_components/performers-section"
import { DashboardDateRangeFilter } from "@/components/dashboards/dashboard-date-range-filter"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"

export default async function FleetOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const { period: periodParam, from: fromParam, to: toParam } = resolvedSearchParams
  const period = parseOverviewPeriod(periodParam)

  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key, "FLEET")

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User"

  let customRange: { from: Date; to: Date } | undefined
  if (typeof fromParam === "string" && fromParam.trim()) {
    const parsedFrom = new Date(fromParam)
    if (!isNaN(parsedFrom.getTime())) {
      parsedFrom.setHours(0, 0, 0, 0)
      let parsedTo = new Date()
      if (typeof toParam === "string" && toParam.trim()) {
        const pTo = new Date(toParam)
        if (!isNaN(pTo.getTime())) {
          parsedTo = pTo
        }
      }
      parsedTo.setHours(23, 59, 59, 999)
      customRange = { from: parsedFrom, to: parsedTo }
    }
  }

  const data = await getFleetOverviewData(actor.tenantId, period, customRange)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Hi, Welcome back! {userName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <CardAction className="flex items-center gap-2">
            <DashboardDateRangeFilter />
          </CardAction>
        </CardHeader>
      </Card>

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
    </div>
  )
}
