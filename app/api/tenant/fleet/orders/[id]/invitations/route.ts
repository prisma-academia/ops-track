import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, withTenantContext } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");

    return await withTenantContext(actor, async () => {
      const body = await req.json();
      
      const { transporterId, truckId, driverId, destination, litersRequested, ratePerLiter, message } = body;

      if (!transporterId || !destination || !litersRequested) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Verify order exists
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const invitation = await prisma.transportInvitation.create({
        data: {
          tenantId: actor.tenantId,
          orderId: id,
          transporterId,
          truckId: truckId || null,
          driverId: driverId || null,
          destination,
          litersRequested,
          ratePerLiter: ratePerLiter || null,
          message,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        }
      });

      const meta = requestMeta(req);
      await audit({
        module: "FLEET",
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "invitation.create",
        tenantId: actor.tenantId,
        targetType: "TransportInvitation",
        targetId: invitation.id,
        before: {},
        after: { transporterId, destination, litersRequested, ratePerLiter },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return NextResponse.json({ data: invitation });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
