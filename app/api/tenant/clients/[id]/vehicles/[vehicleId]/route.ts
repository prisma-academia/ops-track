import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateVehicleSchema = z.object({
  plateNumber: z.string().min(2).max(20).transform((v) => v.toUpperCase().trim()).optional(),
  makeModel: z.string().max(100).optional().nullable(),
  fuelType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional(),
  tankCapacity: z.number().positive().max(5000).optional(),
  dailyLimitLiters: z.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, vehicleId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = UpdateVehicleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const vehicle = await prisma.clientVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.clientId !== id || vehicle.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Vehicle not found.");
    }

    if (body.plateNumber && body.plateNumber !== vehicle.plateNumber) {
      const conflict = await prisma.clientVehicle.findUnique({
        where: {
          tenantId_clientId_plateNumber: {
            tenantId: actor.tenantId,
            clientId: id,
            plateNumber: body.plateNumber,
          },
        },
      });
      if (conflict) {
        throw new DomainError(409, "plate_exists", "Vehicle with this plate number already exists.");
      }
    }

    const updated = await prisma.clientVehicle.update({
      where: { id: vehicleId },
      data: {
        plateNumber: body.plateNumber ?? vehicle.plateNumber,
        makeModel: body.makeModel !== undefined ? body.makeModel : vehicle.makeModel,
        fuelType: body.fuelType ?? vehicle.fuelType,
        tankCapacity: body.tankCapacity ?? vehicle.tankCapacity,
        dailyLimitLiters: body.dailyLimitLiters !== undefined ? body.dailyLimitLiters : vehicle.dailyLimitLiters,
        isActive: body.isActive !== undefined ? body.isActive : vehicle.isActive,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.vehicle.update",
      tenantId: actor.tenantId,
      targetType: "ClientVehicle",
      targetId: updated.id,
      before: vehicle as unknown as object,
      after: updated as unknown as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ vehicle: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, vehicleId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const meta = requestMeta(request);

    const vehicle = await prisma.clientVehicle.findUnique({
      where: { id: vehicleId },
      include: { _count: { select: { orders: true } } },
    });
    if (!vehicle || vehicle.clientId !== id || vehicle.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Vehicle not found.");
    }

    if (vehicle._count.orders > 0) {
      // Soft-delete / deactivate if it has order history
      const deactivated = await prisma.clientVehicle.update({
        where: { id: vehicleId },
        data: { isActive: false },
      });
      return ok({ success: true, deactivated: true });
    }

    await prisma.clientVehicle.delete({ where: { id: vehicleId } });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.vehicle.delete",
      tenantId: actor.tenantId,
      targetType: "ClientVehicle",
      targetId: vehicleId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
