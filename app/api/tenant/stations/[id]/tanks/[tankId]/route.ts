import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const optionalReading = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (value === null) return null;
  return Number(value);
}, z.number().nullable().optional());

const optionalWaterLevel = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (value === null) return null;
  return Number(value);
}, z.number().nonnegative().nullable().optional());

const UpdateTankSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional(),
  capacity: z.coerce.number().positive().optional(),
  waterLevel: optionalWaterLevel,
  temperature: optionalReading,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tankId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, tankId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");
    const body = UpdateTankSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.tank.findUnique({ where: { id: tankId } });
    if (!existing || existing.tenantId !== actor.tenantId || existing.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Tank not found.");
    }

    const tank = await prisma.tank.update({
      where: { id: tankId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.productType !== undefined ? { productType: body.productType } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.waterLevel !== undefined ? { waterLevel: body.waterLevel } : {}),
        ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tank.update",
      tenantId: actor.tenantId,
      targetType: "Tank",
      targetId: tank.id,
      before: {
        name: existing.name,
        waterLevel: existing.waterLevel,
        temperature: existing.temperature,
      } as object,
      after: {
        name: tank.name,
        waterLevel: tank.waterLevel,
        temperature: tank.temperature,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ tank });
  } catch (e) {
    return handleError(e);
  }
}
