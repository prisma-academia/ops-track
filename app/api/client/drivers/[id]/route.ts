import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireClientActor();

    const driver = await prisma.clientDriver.findFirst({
      where: { id, clientId: actor.clientId, tenantId: actor.tenantId },
    });
    if (!driver) {
      throw new DomainError(404, "not_found", "Driver not found.");
    }

    await prisma.clientDriver.update({
      where: { id },
      data: { isActive: false },
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
