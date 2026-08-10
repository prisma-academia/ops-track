import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateOrderForm } from "./order-form"; 
import { prisma } from "@/lib/db/client";

export default async function NewOrderPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      trucks: {
        select: {
          id: true,
          status: true,
          transports: {
            where: { status: "IN_TRANSIT" },
            select: { id: true }
          }
        }
      }
    }
  });

  const transporterData = transporters.map(t => {
    const totalTrucks = t.trucks.length;
    const inTransit = t.trucks.filter(tr => tr.transports.length > 0).length;
    const available = totalTrucks - inTransit;
    return {
      id: t.id,
      name: t.name,
      totalTrucks,
      inTransit,
      available
    };
  });

  return (
    <div className="space-y-6">
      <CreateOrderForm transporters={transporterData} />
    </div>
  );
}
