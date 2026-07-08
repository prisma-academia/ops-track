import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CancelWaybillSchema = z.object({
  cancellationReason: z.string().min(3),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: waybillAllocationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_WRITE.key);
    const body = CancelWaybillSchema.parse(await request.json());
    const meta = requestMeta(request);

    const allocation = await prisma.waybillAllocation.findUnique({
      where: { id: waybillAllocationId },
      include: { waybill: true }
    });

    if (!allocation || allocation.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill allocation not found.");
    }

    if (allocation.status === "COMPLETED" || allocation.status === "CANCELLED") {
      throw new DomainError(400, "invalid_status", "Waybill allocation cannot be cancelled in its current state.");
    }

    const updatedAllocation = await prisma.waybillAllocation.update({
      where: { id: waybillAllocationId },
      data: {
        status: "CANCELLED",
        cancellationReason: body.cancellationReason,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill.cancel",
      tenantId: actor.tenantId,
      targetType: "WaybillAllocation",
      targetId: waybillAllocationId,
      after: {
        status: "CANCELLED",
        cancellationReason: body.cancellationReason,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ waybillAllocation: updatedAllocation });
  } catch (e) {
    return handleError(e);
  }
}
