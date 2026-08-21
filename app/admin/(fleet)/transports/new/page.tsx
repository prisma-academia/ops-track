import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTransportForm } from "./transport-form"; 

export default async function NewTransportPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_TRANSPORTS_WRITE.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  
  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true, transporterId: true, capacityLiters: true },
    orderBy: { name: "asc" },
  });
  
  const drivers = await prisma.driver.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, firstName: true, lastName: true, transporterId: true },
    orderBy: { firstName: "asc" },
  });
  
  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { 
      id: true, 
      reference: true, 
      productType: true,
      litersOrdered: true,
      sourceDepot: true,
      transports: { 
        where: { status: { not: "CANCELLED" } },
        select: { litersCarried: true } 
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const preselectedOrderId =
    typeof searchParams?.orderId === "string" ? searchParams.orderId : undefined;

  return (
    <div className="space-y-6">
      <CreateTransportForm 
        transporters={transporters} 
        trucks={JSON.parse(JSON.stringify(trucks))} 
        drivers={drivers} 
        orders={JSON.parse(JSON.stringify(orders))} 
        preselectedOrderId={preselectedOrderId}
      />
    </div>
  );
}
