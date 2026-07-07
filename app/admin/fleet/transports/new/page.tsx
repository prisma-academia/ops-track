import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTransportForm } from "./transport-form"; 

export default async function NewTransportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  
  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, name: true, transporterId: true },
    orderBy: { name: "asc" },
  });
  
  const drivers = await prisma.driver.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, transporterId: true },
    orderBy: { firstName: "asc" },
  });
  
  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { id: true, reference: true, transportCost: true, productType: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <CreateTransportForm 
        transporters={transporters} 
        trucks={trucks} 
        drivers={drivers} 
        orders={JSON.parse(JSON.stringify(orders))} 
      />
    </div>
  );
}
