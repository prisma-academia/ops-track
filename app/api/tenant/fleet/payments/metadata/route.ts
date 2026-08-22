import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseTenantSettings } from "@/lib/tenant/settings";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_READ.key,
      "FLEET",
    );

    const [
      customers,
      transporters,
      trucks,
      orders,
      transports,
      sales,
      stations,
      bankAccounts,
      tenant,
    ] = await Promise.all([
      prisma.customer.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transporter.findMany({
        where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
      }),
      prisma.truck.findMany({
        where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
      }),
      prisma.order.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.transport.findMany({
        where: { tenantId: actor.tenantId },
        include: {
          transporter: true,
          truck: true,
          order: true,
          deliveries: {
            include: { customer: true, station: true },
          },
          transactions: {
            where: { category: "TRANSPORT_PAYMENT" },
          },
        },
      }),
      prisma.delivery.findMany({
        where: {
          tenantId: actor.tenantId,
          status: { in: ["UNPAID", "PART_PAID"] },
        },
        include: { customer: true, station: true },
      }),
      prisma.station.findMany({ where: { tenantId: actor.tenantId } }),
      prisma.bankAccount.findMany({
        where: { tenantId: actor.tenantId, scope: "FLEET", isActive: true },
      }),
      prisma.tenant.findUnique({
        where: { id: actor.tenantId },
        select: { settingsJson: true },
      }),
    ]);

    const settings = parseTenantSettings(tenant?.settingsJson);

    return ok({
      customers,
      transporters,
      trucks,
      orders,
      transports,
      sales,
      stations,
      bankAccounts,
      originToDepotFee: settings.originToDepotFee,
    });
  } catch (e) {
    return handleError(e);
  }
}
