import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { Building2, Truck, Users, Route } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/date-range-picker";

export default async function FleetOverviewPage() {
  const actor = await requireTenantPage();
  
  // Dashboard stats
  const [transportersCount, trucksCount, driversCount, activeTransports] = await Promise.all([
    prisma.transporter.count({ where: { tenantId: actor.tenantId } }),
    prisma.truck.count({ where: { tenantId: actor.tenantId } }),
    prisma.driver.count({ where: { tenantId: actor.tenantId } }),
    prisma.transport.count({ where: { tenantId: actor.tenantId, status: "IN_TRANSIT" } }),
  ]);

  const stats = [
    { title: "Total Transporters", value: transportersCount, description: "Active transporters", icon: Building2 },
    { title: "Total Trucks", value: trucksCount, description: "Fleet size", icon: Truck },
    { title: "Total Drivers", value: driversCount, description: "Registered drivers", icon: Users },
    { title: "Active Transports", value: activeTransports, description: "Trips currently in transit", icon: Route },
  ];

  return (
    <div className="flex-1 space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Fleet Overview</CardTitle>
          </div>
          <CardAction className="flex items-center gap-2">
            <DatePickerWithRange />
          </CardAction>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview Map</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 flex h-[350px] items-center justify-center text-muted-foreground">
            {/* Placeholder for future charts or maps */}
            Map or Chart integration goes here
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center text-muted-foreground">
            {/* Placeholder for recent activity feed */}
            Recent Fleet Activity goes here
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
