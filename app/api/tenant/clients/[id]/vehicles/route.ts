import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateVehicleSchema = z.object({
  plateNumber: z.string().min(2).max(20).transform((v) => v.toUpperCase().trim()),
  makeModel: z.string().max(100).optional().nullable(),
  fuelType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  tankCapacity: z.number().positive().max(5000),
  dailyLimitLiters: z.number().positive().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    const vehicles = await prisma.clientVehicle.findMany({
      where: { clientId: id, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return ok({ vehicles });
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
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = CreateVehicleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    const existing = await prisma.clientVehicle.findUnique({
      where: {
        tenantId_clientId_plateNumber: {
          tenantId: actor.tenantId,
          clientId: id,
          plateNumber: body.plateNumber,
        },
      },
    });
    if (existing) {
      throw new DomainError(409, "plate_exists", "A vehicle with this plate number is already registered for this client.");
    }

    const vehicle = await prisma.clientVehicle.create({
      data: {
        tenantId: actor.tenantId,
        clientId: id,
        plateNumber: body.plateNumber,
        makeModel: body.makeModel ?? null,
        fuelType: body.fuelType,
        tankCapacity: body.tankCapacity,
        dailyLimitLiters: body.dailyLimitLiters ?? null,
        isActive: true,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.vehicle.create",
      tenantId: actor.tenantId,
      targetType: "ClientVehicle",
      targetId: vehicle.id,
      after: vehicle as unknown as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ vehicle });
  } catch (e) {
    return handleError(e);
  }
}
