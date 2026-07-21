import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateDriverSchema = z.object({
  transporterId: z.string().min(1).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).optional(),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiryDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const driver = await prisma.driver.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        transporter: true,
      },
    });

    if (!driver) throw new DomainError(404, "not_found", "Driver not found.");
    return ok({ driver });
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
    const body = UpdateDriverSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.driver.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Driver not found.");

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        ...(body.transporterId !== undefined && { transporterId: body.transporterId }),
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.licenseNumber !== undefined && { licenseNumber: body.licenseNumber }),
        ...(body.licenseExpiryDate !== undefined && { 
          licenseExpiryDate: body.licenseExpiryDate ? new Date(body.licenseExpiryDate) : null 
        }),
        ...(body.address !== undefined && { address: body.address }),
      },
      include: {
        transporter: true,
      }
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "driver.update",
      tenantId: actor.tenantId,
      targetType: "Driver",
      targetId: driver.id,
      before: { name: `${existing.firstName} ${existing.lastName}` } as object,
      after: { name: `${driver.firstName} ${driver.lastName}` } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ driver });
  } catch (e) {
    return handleError(e);
  }
}
