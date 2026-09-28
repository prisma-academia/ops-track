import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateStationsSchema = z.object({
  stationIds: z.array(z.string()),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = UpdateStationsSchema.parse(await request.json());
    const meta = requestMeta(request);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    // Verify all stationIds belong to this tenant
    if (body.stationIds.length > 0) {
      const validStations = await prisma.station.findMany({
        where: { id: { in: body.stationIds }, tenantId: actor.tenantId },
        select: { id: true },
      });
      if (validStations.length !== body.stationIds.length) {
        throw new DomainError(400, "invalid_stations", "One or more selected stations are invalid or not in this organization.");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.clientStationAccess.deleteMany({ where: { clientId: id } });

      if (body.stationIds.length > 0) {
        await tx.clientStationAccess.createMany({
          data: body.stationIds.map((stationId) => ({
            tenantId: actor.tenantId,
            clientId: id,
            stationId,
          })),
        });
      }
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.stations.update",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: id,
      after: { stationIds: body.stationIds } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true, count: body.stationIds.length });
  } catch (e) {
    return handleError(e);
  }
}
