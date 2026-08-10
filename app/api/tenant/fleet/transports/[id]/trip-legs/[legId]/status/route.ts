import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateStatusSchema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string, legId: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = UpdateStatusSchema.parse(await request.json());
    const meta = requestMeta(request);
    const { legId } = await context.params;

    const leg = await prisma.transportTripLeg.findUnique({
      where: { id: legId, tenantId: actor.tenantId },
    });

    if (!leg) {
      throw new Error("Trip Leg not found");
    }

    const updatedLeg = await prisma.transportTripLeg.update({
      where: { id: legId },
      data: {
        status: body.status,
        ...(body.status === "IN_PROGRESS" && !leg.startedAt ? { startedAt: new Date() } : {}),
        ...(body.status === "COMPLETED" && !leg.completedAt ? { completedAt: new Date() } : {}),
      }
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport.tripleg.update",
      tenantId: actor.tenantId,
      targetType: "TransportTripLeg",
      targetId: leg.id,
      before: { status: leg.status } as object,
      after: { status: updatedLeg.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ leg: updatedLeg });
  } catch (e) {
    return handleError(e);
  }
}
