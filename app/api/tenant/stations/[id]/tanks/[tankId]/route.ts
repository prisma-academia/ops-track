import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

import { Prisma } from "@/lib/generated/prisma/client";

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

const optionalCurrentLiters = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}, z.number().nonnegative().optional());

const UpdateTankSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional(),
  capacity: z.coerce.number().positive().optional(),
  currentLiters: optionalCurrentLiters,
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
    const actor = await requireTenantActor(undefined, "STATION");
    if (
      !hasPermission(actor, PERMISSIONS.TENANT_TANKS_WRITE.key) &&
      !hasPermission(actor, PERMISSIONS.TENANT_STATIONS_WRITE.key)
    ) {
      throw new DomainError(403, "forbidden", "You do not have permission to modify tanks.");
    }
    const body = UpdateTankSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        _count: {
          select: {
            dippings: true,
            waybillDippings: true,
            pumps: true,
            stockMovements: true,
          },
        },
        stockMovements: {
          where: {
            movementType: { not: "OPENING_BALANCE" },
          },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!existing || existing.tenantId !== actor.tenantId || existing.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Tank not found.");
    }

    const hasRecords =
      existing._count.dippings > 0 ||
      existing._count.waybillDippings > 0 ||
      existing._count.pumps > 0 ||
      existing._count.stockMovements > 1 ||
      existing.stockMovements.length > 0;

    if (hasRecords) {
      if (body.productType !== undefined && body.productType !== existing.productType) {
        throw new DomainError(
          400,
          "product_type_locked",
          "Cannot change product type because this tank has existing records (pumps, dippings, or stock movements)."
        );
      }
      if (
        body.currentLiters !== undefined &&
        body.currentLiters !== Number(existing.currentLiters)
      ) {
        throw new DomainError(
          400,
          "current_liters_locked",
          "Current stock cannot be manually adjusted on a tank with active records. Stock is updated through dippings and deliveries."
        );
      }
    }

    const effectiveCapacity = body.capacity ?? Number(existing.capacity);
    if (effectiveCapacity < Number(existing.currentLiters)) {
      throw new DomainError(400, "invalid_capacity", "Capacity cannot be less than current stock.");
    }
    if (body.currentLiters !== undefined && body.currentLiters > effectiveCapacity) {
      throw new DomainError(400, "invalid_capacity", "Tank stock cannot exceed capacity.");
    }

    const tank = await prisma.$transaction(async (tx) => {
      if (body.currentLiters !== undefined && body.currentLiters !== Number(existing.currentLiters)) {
        const movements = await tx.stockMovement.findMany({
          where: { tankId },
          orderBy: { recordedAt: "asc" },
        });

        if (movements.length === 0) {
          if (body.currentLiters > 0) {
            await tx.stockMovement.create({
              data: {
                tenantId: actor.tenantId,
                stationId,
                tankId,
                movementType: "OPENING_BALANCE",
                productType: body.productType ?? existing.productType,
                quantity: new Prisma.Decimal(body.currentLiters),
                balanceAfter: new Prisma.Decimal(body.currentLiters),
                referenceType: "TankSetupCorrection",
                notes: "Initial fuel volume set via tank details",
                recordedById: actor.userId,
              },
            });
          }
        } else if (movements.length === 1 && movements[0].movementType === "OPENING_BALANCE") {
          await tx.stockMovement.update({
            where: { id: movements[0].id },
            data: {
              quantity: new Prisma.Decimal(body.currentLiters),
              balanceAfter: new Prisma.Decimal(body.currentLiters),
              productType: body.productType ?? existing.productType,
              notes: "Initial fuel volume corrected via tank details",
              recordedById: actor.userId,
            },
          });
        } else {
          const delta = body.currentLiters - Number(existing.currentLiters);
          await tx.stockMovement.create({
            data: {
              tenantId: actor.tenantId,
              stationId,
              tankId,
              movementType: "ADJUSTMENT",
              productType: body.productType ?? existing.productType,
              quantity: new Prisma.Decimal(delta),
              balanceAfter: new Prisma.Decimal(body.currentLiters),
              referenceType: "ManualAdjustment",
              notes: "Stock adjusted via tank details",
              recordedById: actor.userId,
            },
          });
        }
      }

      return tx.tank.update({
        where: { id: tankId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.productType !== undefined ? { productType: body.productType } : {}),
          ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
          ...(body.currentLiters !== undefined ? { currentLiters: body.currentLiters } : {}),
          ...(body.waterLevel !== undefined ? { waterLevel: body.waterLevel } : {}),
          ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
        },
      });
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
        capacity: existing.capacity,
        currentLiters: existing.currentLiters,
        waterLevel: existing.waterLevel,
        temperature: existing.temperature,
      } as object,
      after: {
        name: tank.name,
        capacity: tank.capacity,
        currentLiters: tank.currentLiters,
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
