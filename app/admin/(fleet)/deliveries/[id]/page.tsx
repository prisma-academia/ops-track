import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { SalesDetailsManager } from "./deliveries-details-manager";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { toFleetPnlDetailRow } from "@/app/admin/(fleet)/fleet-pnl-report/fleet-pnl-detail-rows";
import type { FleetPnlTableRow } from "@/app/admin/(fleet)/fleet-pnl-report/fleet-pnl-columns";

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
          deliveries: {
            select: { id: true, litersDespatched: true },
          },
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

  let pnlBreakdownRow: FleetPnlTableRow | null = null;
  let orderId: string | null = null;
  let orderReference: string | null = null;
  const transportOrderId = delivery.transport?.orderId;

  if (transportOrderId) {
    const order = await prisma.order.findFirst({
      where: { id: transportOrderId, tenantId: actor.tenantId },
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
      const { summary, transports } = calculateOrderPnlSummary(order);
      orderId = order.id;
      orderReference = summary.orderReference;

      for (const transport of transports) {
        const deliveryRow = transport.deliveries.find((row: { id: string }) => row.id === delivery.id);
        if (deliveryRow) {
          pnlBreakdownRow = toFleetPnlDetailRow(deliveryRow, summary, transport);
          break;
        }
      }
    }
  }

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <SalesDetailsManager
        delivery={JSON.parse(JSON.stringify(delivery))}
        pnlBreakdownRow={pnlBreakdownRow}
        orderId={orderId}
        orderReference={orderReference}
        stations={stations}
      />
    </div>
  );
}
