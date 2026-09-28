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

    const vehicle = await prisma.clientVehicle.findFirst({
      where: { id, clientId: actor.clientId, tenantId: actor.tenantId },
    });
    if (!vehicle) {
      throw new DomainError(404, "not_found", "Vehicle not found.");
    }

    await prisma.clientVehicle.update({
      where: { id },
      data: { isActive: false },
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
