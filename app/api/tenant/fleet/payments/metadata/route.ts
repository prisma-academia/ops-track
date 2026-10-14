import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { serializeOrderPayables } from "@/lib/fleet/suppliers";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_READ.key,
      "FLEET",
    );

    const [
      customers,
      suppliers,
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
      prisma.supplier.findMany({
        where: { tenantId: actor.tenantId },
        orderBy: { name: "asc" },
      }),
      prisma.transporter.findMany({
        where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
      }),
      prisma.truck.findMany({
        where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
      }),
      prisma.order.findMany({
        where: { tenantId: actor.tenantId },
        select: {
          id: true,
          reference: true,
          supplier: true,
          supplierId: true,
          productType: true,
          litersOrdered: true,
          pricePerLitre: true,
          loadingCostPerLitre: true,
          paymentPaid: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
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

    const ordersWithPayables = orders.map((o) => ({
      ...o,
      litersOrdered: Number(o.litersOrdered),
      pricePerLitre: Number(o.pricePerLitre),
      loadingCostPerLitre: Number(o.loadingCostPerLitre),
      ...serializeOrderPayables({
        ...o,
        paymentPaid: o.paymentPaid,
      }),
    }));

    const suppliersSerialized = suppliers.map((s) => ({
      ...s,
      depositBalance: Number(s.depositBalance),
      outstandingBalance: Number(s.outstandingBalance),
    }));

    return ok({
      customers,
      suppliers: suppliersSerialized,
      transporters,
      trucks,
      orders: ordersWithPayables,
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
