import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

import { Prisma } from "@/lib/generated/prisma/client";

const optionalReading = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  return Number(value);
}, z.number().nullable());

const optionalWaterLevel = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  return Number(value);
}, z.number().nonnegative().nullable());

const CreateTankSchema = z.object({
  name: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive(),
  currentLiters: z.coerce.number().nonnegative().optional().default(0),
  openingLiters: z.coerce.number().nonnegative().optional(),
  waterLevel: optionalWaterLevel.optional(),
  temperature: optionalReading.optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const tanks = await prisma.tank.findMany({
      where: { stationId, tenantId: actor.tenantId },
      include: {
        _count: {
          select: {
            pumps: true,
            dippings: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return ok(tanks);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");

    const body = CreateTankSchema.parse(await request.json());
    const initialLiters = body.openingLiters ?? body.currentLiters ?? 0;
    if (initialLiters > body.capacity) {
      throw new DomainError(400, "invalid_capacity", "Initial stock cannot exceed tank capacity.");
    }
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const tank = await prisma.$transaction(async (tx) => {
      const createdTank = await tx.tank.create({
        data: {
          tenantId: actor.tenantId,
          stationId,
          name: body.name,
          productType: body.productType,
          capacity: body.capacity,
          currentLiters: initialLiters,
          waterLevel: body.waterLevel ?? null,
          temperature: body.temperature ?? null,
        },
      });

      if (initialLiters > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: actor.tenantId,
            stationId,
            tankId: createdTank.id,
            movementType: "OPENING_BALANCE",
            productType: body.productType,
            quantity: new Prisma.Decimal(initialLiters),
            balanceAfter: new Prisma.Decimal(initialLiters),
            referenceType: "TankCreation",
            notes: "Initial fuel volume upon tank onboarding",
            recordedById: actor.userId,
          },
        });
      }

      return createdTank;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tank.create",
      tenantId: actor.tenantId,
      targetType: "Tank",
      targetId: tank.id,
      after: {
        name: tank.name,
        productType: tank.productType,
        capacity: tank.capacity,
        currentLiters: tank.currentLiters,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ tank });
  } catch (e) {
    return handleError(e);
  }
}
