import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ReassignSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string, legId: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_WRITE.key, "FLEET");
    const body = ReassignSchema.parse(await request.json());
    const meta = requestMeta(request);
    const { legId } = await context.params;

    const leg = await prisma.transportTripLeg.findUnique({
      where: { id: legId, tenantId: actor.tenantId },
      include: {
        driverAssignments: {
          where: { status: "ACTIVE" }
        }
      }
    });

    if (!leg) {
      throw new Error("Trip Leg not found");
    }

    const currentAssignment = leg.driverAssignments[0];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark current as REASSIGNED (if exists)
      if (currentAssignment) {
        await tx.driverAssignment.update({
          where: { id: currentAssignment.id },
          data: { status: "REASSIGNED" }
        });
      }

      // 2. Create new ACTIVE assignment
      const newAssignment = await tx.driverAssignment.create({
        data: {
          tenantId: actor.tenantId,
          tripLegId: leg.id,
          driverId: body.driverId,
          status: "ACTIVE",
          notes: body.notes ?? null,
        }
      });

      return newAssignment;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport.tripleg.reassign",
      tenantId: actor.tenantId,
      targetType: "TransportTripLeg",
      targetId: leg.id,
      before: currentAssignment ? { driverId: currentAssignment.driverId } as object : {},
      after: { driverId: result.driverId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ assignment: result });
  } catch (e) {
    return handleError(e);
  }
}
