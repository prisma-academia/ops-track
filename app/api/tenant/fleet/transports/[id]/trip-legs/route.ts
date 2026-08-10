import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateTripLegSchema = z.object({
  type: z.enum([
    "ORIGIN_TO_DEPOT",
    "DEPOT_TO_PRIMARY",
    "PRIMARY_TO_SUBSEQUENT",
    "SUBSEQUENT_TO_SUBSEQUENT",
    "DESTINATION_TO_ORIGIN"
  ]),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  driverId: z.string().min(1, "Driver is required"),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = CreateTripLegSchema.parse(await request.json());
    const meta = requestMeta(request);
    const { id: transportId } = await context.params;

    const transport = await prisma.transport.findUnique({
      where: { id: transportId, tenantId: actor.tenantId },
      include: {
        transportTripLegs: {
          orderBy: { sequence: "desc" },
          take: 1
        }
      }
    });

    if (!transport) {
      throw new Error("Transport not found");
    }

    const nextSequence = transport.transportTripLegs.length > 0 ? transport.transportTripLegs[0].sequence + 1 : 1;

    const leg = await prisma.$transaction(async (tx) => {
      const newLeg = await tx.transportTripLeg.create({
        data: {
          tenantId: actor.tenantId,
          transportId: transport.id,
          type: body.type,
          sequence: nextSequence,
          origin: body.origin,
          destination: body.destination,
          notes: body.notes ?? null,
          status: "PENDING",
        }
      });

      await tx.driverAssignment.create({
        data: {
          tenantId: actor.tenantId,
          driverId: body.driverId,
          tripLegId: newLeg.id,
          status: "ACTIVE",
        }
      });

      return newLeg;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport.tripleg.create",
      tenantId: actor.tenantId,
      targetType: "TransportTripLeg",
      targetId: leg.id,
      after: { transportId, type: leg.type, origin: leg.origin, destination: leg.destination } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ leg });
  } catch (e) {
    return handleError(e);
  }
}
