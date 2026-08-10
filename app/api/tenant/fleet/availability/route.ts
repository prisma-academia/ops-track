import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, withTenantContext } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    return await withTenantContext(actor, async () => {
      // Fetch Trucks and their active transports
      const trucks = await prisma.truck.findMany({
        where: { status: "ACTIVE" },
        include: {
          transports: {
            where: {
              status: { in: ["IN_TRANSIT"] }
            },
            include: { order: true }
          }
        },
        orderBy: { plateNumber: 'asc' }
      });

      // Fetch Drivers and their active assignments
      const drivers = await prisma.driver.findMany({
        where: { status: "ACTIVE" },
        include: {
          driverAssignments: {
            where: { status: "ACTIVE" },
            include: {
              tripLeg: {
                include: {
                  transport: { include: { order: true } }
                }
              }
            }
          }
        },
        orderBy: { firstName: 'asc' }
      });

      return NextResponse.json({
        trucks: trucks.map(t => ({
          id: t.id,
          name: t.name,
          plateNumber: t.plateNumber,
          capacity: t.capacityLiters,
          transporterId: t.transporterId,
          activeTransport: t.transports.length > 0 ? {
            orderId: t.transports[0].orderId,
            orderReference: t.transports[0].order?.reference,
            destination: t.transports[0].destination,
            status: t.transports[0].status
          } : null
        })),
        drivers: drivers.map(d => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          activeAssignment: d.driverAssignments.length > 0 ? {
            orderId: d.driverAssignments[0].tripLeg.transport.orderId,
            orderReference: d.driverAssignments[0].tripLeg.transport.order?.reference,
            legType: d.driverAssignments[0].tripLeg.type,
            status: d.driverAssignments[0].tripLeg.status
          } : null
        }))
      });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
