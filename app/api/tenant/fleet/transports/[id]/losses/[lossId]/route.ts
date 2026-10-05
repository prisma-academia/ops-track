import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { recomputeTransportLoss } from "@/lib/fleet/transport-volume";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; lossId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, lossId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_WRITE.key, "FLEET");
    const meta = requestMeta(request);

    const transport = await prisma.transport.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!transport) throw new DomainError(404, "not_found", "Transport not found.");

    if (transport.status === "COMPLETED" || transport.status === "CANCELLED") {
      throw new DomainError(
        400,
        "invalid_state",
        "Cannot delete loss logs for a completed or cancelled transport."
      );
    }

    const lossLog = await prisma.transportLossLog.findFirst({
      where: { id: lossId, transportId: id, tenantId: actor.tenantId },
    });
    if (!lossLog) throw new DomainError(404, "not_found", "Loss log not found.");

    const expenses = Number(lossLog.expensesIncurred || 0);

    await prisma.$transaction(async (tx) => {
      await tx.transportLossLog.delete({
        where: { id: lossLog.id },
      });

      if (expenses > 0) {
        const newMaintenance = Math.max(0, Number(transport.maintenanceCost) - expenses);
        await tx.transport.update({
          where: { id: transport.id },
          data: { maintenanceCost: newMaintenance },
        });
      }
    });

    await recomputeTransportLoss(prisma, id);

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport.loss_log.delete",
      tenantId: actor.tenantId,
      targetType: "TransportLossLog",
      targetId: lossLog.id,
      before: {
        transportId: id,
        lossType: lossLog.lossType,
        lostQuantity: lossLog.lostQuantity.toString(),
        expensesIncurred: lossLog.expensesIncurred.toString(),
        comment: lossLog.comment,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
