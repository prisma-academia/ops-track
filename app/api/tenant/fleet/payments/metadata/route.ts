import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    
    // Fetch Customers, Transporters, Trucks, Orders, Transports, and Pending Sales
    const [customers, transporters, trucks, orders, transports, sales, stations] = await Promise.all([
      prisma.customer.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transporter.findMany({ where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true } }),
      prisma.truck.findMany({ where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true } }),
      prisma.order.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transport.findMany({ 
        where: { tenantId: actor.tenantId },
        include: { transporter: true, truck: true, order: true }
      }),
      prisma.sale.findMany({
        where: { tenantId: actor.tenantId, status: { in: ["UNPAID", "PART_PAID"] } },
        include: { customer: true, station: true },
      }),
      prisma.station.findMany({ where: { tenantId: actor.tenantId } }),
    ]);

    return ok({ customers, transporters, trucks, orders, transports, sales, stations });
  } catch (e) {
    return handleError(e);
  }
}
