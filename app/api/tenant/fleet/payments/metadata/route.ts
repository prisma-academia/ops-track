import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    
    // Fetch Customers, Transporters, Trucks, Orders, Transports
    const [customers, transporters, trucks, orders, transports] = await Promise.all([
      prisma.customer.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transporter.findMany({ where: { tenantId: actor.tenantId, status: "ACTIVE" } }),
      prisma.truck.findMany({ where: { tenantId: actor.tenantId, status: "ACTIVE" } }),
      prisma.order.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transport.findMany({ 
        where: { tenantId: actor.tenantId },
        include: { transporter: true, truck: true, order: true }
      }),
    ]);

    return ok({ customers, transporters, trucks, orders, transports });
  } catch (e) {
    return handleError(e);
  }
}
