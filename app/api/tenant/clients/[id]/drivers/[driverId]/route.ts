import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateDriverSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(30).optional(),
  licenseNumber: z.string().max(50).optional().nullable(),
  idCardPhotoUrl: z.string().url().optional().nullable(),
  driverPhotoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; driverId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, driverId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = UpdateDriverSchema.parse(await request.json());
    const meta = requestMeta(request);

    const driver = await prisma.clientDriver.findUnique({ where: { id: driverId } });
    if (!driver || driver.clientId !== id || driver.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Driver not found.");
    }

    const updated = await prisma.clientDriver.update({
      where: { id: driverId },
      data: {
        fullName: body.fullName ?? driver.fullName,
        phone: body.phone ?? driver.phone,
        licenseNumber: body.licenseNumber !== undefined ? body.licenseNumber : driver.licenseNumber,
        idCardPhotoUrl: body.idCardPhotoUrl !== undefined ? body.idCardPhotoUrl : driver.idCardPhotoUrl,
        driverPhotoUrl: body.driverPhotoUrl !== undefined ? body.driverPhotoUrl : driver.driverPhotoUrl,
        isActive: body.isActive !== undefined ? body.isActive : driver.isActive,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.driver.update",
      tenantId: actor.tenantId,
      targetType: "ClientDriver",
      targetId: updated.id,
      before: driver as unknown as object,
      after: updated as unknown as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ driver: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; driverId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, driverId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const meta = requestMeta(request);

    const driver = await prisma.clientDriver.findUnique({
      where: { id: driverId },
      include: { _count: { select: { orders: true } } },
    });
    if (!driver || driver.clientId !== id || driver.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Driver not found.");
    }

    if (driver._count.orders > 0) {
      const deactivated = await prisma.clientDriver.update({
        where: { id: driverId },
        data: { isActive: false },
      });
      return ok({ success: true, deactivated: true });
    }

    await prisma.clientDriver.delete({ where: { id: driverId } });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.driver.delete",
      tenantId: actor.tenantId,
      targetType: "ClientDriver",
      targetId: driverId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
