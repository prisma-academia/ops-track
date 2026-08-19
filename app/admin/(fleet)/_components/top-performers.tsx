import type { FleetOverviewData } from "../types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardCard } from "@/components/dashboards/dashboard-card"
import { PerformanceList } from "./performance-list"
import { StationPerformanceList } from "./station-performance-list"

export function TopPerformers({ data }: { data: FleetOverviewData }) {
  const mappedTransporters = data.transporterPerformance.map((t) => ({
    name: t.transporter,
    subtitle: `${t.trips} trips`,
    value: t.volume,
    amount: t.amount,
  }))

  const mappedClients = data.clientPerformance.map((c) => ({
    name: c.name,
    subtitle: `${c.trips} deliveries`,
    value: c.volume,
    amount: c.amount,
  }))

  return (
    <Tabs defaultValue="transporters" className="w-full">
      <DashboardCard
        title="Top Performers"
        period={data.period}
        action={
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="transporters">Transporters</TabsTrigger>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="clients">B2B Clients</TabsTrigger>
          </TabsList>
        }
        contentClassName="min-h-[24rem]"
      >
        <TabsContent value="transporters" className="mt-0">
          <PerformanceList data={mappedTransporters} iconUrl="/assets/icons/gas-truck.png" />
        </TabsContent>
        <TabsContent value="stations" className="mt-0">
          <StationPerformanceList data={data.stationPerformance} />
        </TabsContent>
        <TabsContent value="clients" className="mt-0">
          <PerformanceList data={mappedClients} iconUrl="/assets/icons/gps.png" />
        </TabsContent>
      </DashboardCard>
    </Tabs>
  )
}
