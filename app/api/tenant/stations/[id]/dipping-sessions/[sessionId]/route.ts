import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string, sessionId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, sessionId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key);

    const session = await prisma.dippingSession.findUnique({
      where: { id: sessionId },
      include: { closings: true },
    });

    if (!session || session.tenantId !== actor.tenantId || session.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Session not found.");
    }

    if (session.closings.length === 0) {
      throw new DomainError(400, "no_closings", "Cannot complete a session with no closings.");
    }

    const updatedSession = await prisma.dippingSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return ok({ session: updatedSession });
  } catch (e) {
    return handleError(e);
  }
}
