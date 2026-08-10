import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { OrderDetailsManager } from "./order-details-manager";
import { calculateOrderPnL } from "@/lib/fleet/financials";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      transports: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          transporter: { select: { id: true, name: true } },
          truck: { select: { id: true, name: true, plateNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
          transportTripLegs: {
            orderBy: { sequence: 'asc' },
            include: {
              driverAssignments: {
                orderBy: { assignedAt: 'desc' },
                include: {
                  driver: { select: { id: true, firstName: true, lastName: true } }
                }
              }
            }
          }
        },
      },
      transportInvitations: {
        orderBy: { createdAt: 'desc' },
        include: {
          transporter: { select: { id: true, name: true } },
          truck: { select: { id: true, plateNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } }
        }
      }
    },
  });

  if (!order || order.tenantId !== actor.tenantId) {
    redirect("/admin/fleet/orders");
  }

  // Lookups for the Edit modal and Map
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const depots = await prisma.depot.findMany({ 
    select: { id: true, name: true, latitude: true, longitude: true }, 
    orderBy: { name: "asc" } 
  });

  const serializedOrder = JSON.parse(JSON.stringify(order));
  const pnl = await calculateOrderPnL(order.id);

  return <OrderDetailsManager order={serializedOrder} lookups={{ suppliers, depots }} pnl={pnl} />;
}
