import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreatePumpSchema = z.object({
  name: z.string().min(1).max(50),
  tankId: z.string().min(1),
  nozzles: z.array(
    z.object({
      name: z.string().min(1).max(50),
    })
  ).min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const pumps = await prisma.pump.findMany({
      where: { stationId, tenantId: actor.tenantId },
      include: {
        tank: {
          select: {
            id: true,
            name: true,
            productType: true,
          },
        },
        nozzles: true,
      },
      orderBy: { name: "asc" },
    });

    return ok(pumps);
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
    const body = CreatePumpSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify tank ownership and connection to the same station
    const tank = await prisma.tank.findUnique({ where: { id: body.tankId } });
    if (!tank || tank.tenantId !== actor.tenantId || tank.stationId !== stationId) {
      throw new DomainError(400, "invalid_tank", "Tank does not belong to this station.");
    }

    // Create the pump and its nozzles
    const pump = await prisma.pump.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        tankId: body.tankId,
        name: body.name,
        nozzles: {
          create: body.nozzles.map((n) => ({
            tenantId: actor.tenantId,
            name: n.name,
          })),
        },
      },
      include: {
        nozzles: true,
        tank: true,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "pump.create",
      tenantId: actor.tenantId,
      targetType: "Pump",
      targetId: pump.id,
      after: { name: pump.name, tankId: pump.tankId, nozzleCount: pump.nozzles.length } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ pump });
  } catch (e) {
    return handleError(e);
  }
}
