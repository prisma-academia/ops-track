import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { SalesDetailsManager, type SalePnlSummary } from "./deliveries-details-manager";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";

export default async function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_READ.key);
  const { id } = await params;

  const delivery = await prisma.delivery.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      customer: true,
      station: true,
      transport: {
        include: {
          transporter: true,
          truck: true,
          driver: true,
          order: true,
          lossLogs: true,
        }
      },
      transactions: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!delivery) {
    notFound();
  }

  let salePnl: SalePnlSummary | null = null;
  const orderId = delivery.transport?.orderId;

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: actor.tenantId },
      include: {
        transports: {
          include: {
            transporter: { select: { name: true } },
            truck: { select: { id: true, name: true, plateNumber: true } },
            deliveries: {
              include: {
                customer: { select: { name: true } },
                station: { select: { name: true } },
                transactions: {
                  where: { type: "INFLOW" },
                  select: { type: true, amount: true },
                },
              },
            },
          },
        },
      },
    });

    if (order) {
      const { transports } = calculateOrderPnlSummary(order);
      const row = transports.flatMap((t) => t.deliveries).find((d) => d.id === delivery.id);
      if (row) {
        salePnl = {
          orderId: order.id,
          orderReference: order.reference || "N/A",
          litersSold: row.litersSold,
          sellingPrice: row.sellingPrice,
          purchaseCost: row.purchaseCost,
          loadingCost: row.loadingCost,
          depotToPrimaryCost: row.depotToPrimaryCost,
          deliveryTransportCost: row.deliveryTransportCost,
          fleetCost: row.fleetCost,
          totalCost: row.totalCost,
          pnl: row.pnl,
        };
      }
    }
  }

  return (
    <div className="space-y-6">
      <SalesDetailsManager
        delivery={JSON.parse(JSON.stringify(delivery))}
        salePnl={salePnl}
      />
    </div>
  );
}

