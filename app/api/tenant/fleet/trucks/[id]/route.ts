import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateTruckSchema = z.object({
  transporterId: z.string().min(1).optional(),
  name: z.string().min(2).max(100).optional(),
  truckNumber: z.string().optional().nullable(),
  plateNumber: z.string().min(1).optional(),
  truckBrand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  truckType: z.string().min(1).optional(),
  fuelType: z.string().optional().nullable(),
  capacityLiters: z.coerce.number().positive().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const truck = await prisma.truck.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        transporter: true,
      },
    });

    if (!truck) throw new DomainError(404, "not_found", "Truck not found.");
    return ok({ truck });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = UpdateTruckSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.truck.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Truck not found.");

    const truck = await prisma.truck.update({
      where: { id },
      data: {
        ...(body.transporterId !== undefined && { transporterId: body.transporterId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.truckNumber !== undefined && { truckNumber: body.truckNumber }),
        ...(body.plateNumber !== undefined && { plateNumber: body.plateNumber }),
        ...(body.truckBrand !== undefined && { truckBrand: body.truckBrand }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.truckType !== undefined && { truckType: body.truckType }),
        ...(body.fuelType !== undefined && { fuelType: body.fuelType }),
        ...(body.capacityLiters !== undefined && { capacityLiters: body.capacityLiters }),
      },
      include: {
        transporter: true,
      }
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "truck.update",
      tenantId: actor.tenantId,
      targetType: "Truck",
      targetId: truck.id,
      before: { name: existing.name } as object,
      after: { name: truck.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ truck });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const meta = requestMeta(request);

    const existing = await prisma.truck.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Truck not found.");

    await prisma.truck.delete({
      where: { id },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "truck.delete",
      tenantId: actor.tenantId,
      targetType: "Truck",
      targetId: existing.id,
      before: { name: existing.name } as object,
      after: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e: any) {
    if (e.code === "P2003") {
      return handleError(new DomainError(400, "conflict", "Cannot delete truck because it is associated with existing transports or transactions."));
    }
    return handleError(e);
  }
}
