import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, withTenantContext } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string, invId: string }> }) {
  try {
    const { id, invId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");

    return await withTenantContext(actor, async () => {
      const invitation = await prisma.transportInvitation.findUnique({
        where: { id: invId, orderId: id },
        include: { order: true }
      });

      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json({ error: "Invitation is not pending" }, { status: 400 });
      }

      // Convert invitation to Transport
      const transport = await prisma.transport.create({
        data: {
          tenantId: actor.tenantId,
          orderId: id,
          transporterId: invitation.transporterId,
          truckId: invitation.truckId || undefined,
          driverId: invitation.driverId || undefined,
          destination: invitation.destination,
          litersCarried: invitation.litersRequested,
          ratePerLiter: invitation.ratePerLiter || 0,
          status: "IN_TRANSIT",
        }
      });

      await prisma.transportInvitation.update({
        where: { id: invId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        }
      });

      const meta = requestMeta(req);
      await audit({
        module: "FLEET",
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "invitation.accept",
        tenantId: actor.tenantId,
        targetType: "TransportInvitation",
        targetId: invId,
        before: { status: "PENDING" },
        after: { status: "ACCEPTED", transportId: transport.id },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return NextResponse.json({ data: transport });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
