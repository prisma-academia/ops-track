import type { FleetOverviewData } from "../types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardCard, DashboardCardActionsDropdown } from "@/components/dashboards/dashboard-card"
import { PerformanceList } from "./performance-list"

export function TopPerformers({ data }: { data: FleetOverviewData }) {
  const mappedTransporters = data.transporterPerformance.map((t) => ({
    name: t.transporter,
    subtitle: `${t.trips} Trips`,
    value: t.volume,
    amount: t.amount,
  }))

  const mappedClients = data.clientPerformance.map((c) => ({
    name: c.name,
    subtitle: `${c.trips} Trips`,
    value: c.volume,
    amount: c.amount,
  }))

  return (
    <Tabs defaultValue="transporters" className="w-full">
      <DashboardCard
        title="Top Performers"
        period="By Volume"
        action={
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="transporters">Transporters</TabsTrigger>
            <TabsTrigger value="clients">Stations / Clients</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="transporters" className="mt-0">
          <PerformanceList data={mappedTransporters} iconUrl="/assets/icons/gas-truck.png" />
        </TabsContent>
        <TabsContent value="clients" className="mt-0">
          <PerformanceList data={mappedClients} iconUrl="/assets/icons/gps.png" />
        </TabsContent>
      </DashboardCard>
    </Tabs>
  )
}
