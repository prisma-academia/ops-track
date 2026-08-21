import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateTruckSchema = z.object({
  transporterId: z.string().min(1),
  name: z.string().min(2).max(100),
  truckNumber: z.string().optional().nullable(),
  plateNumber: z.string().min(1),
  truckBrand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  truckType: z.string().min(1),
  fuelType: z.string().optional().nullable(),
  capacityLiters: z.coerce.number().positive(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key, "FLEET");
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const transporterId = url.searchParams.get("transporterId");

    const rows = await prisma.truck.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(transporterId ? { transporterId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        transporter: { select: { id: true, name: true } },
        _count: { select: { transports: true } },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRUCKS_WRITE.key, "FLEET");
    const body = CreateTruckSchema.parse(await request.json());
    const meta = requestMeta(request);

    const truck = await prisma.truck.create({
      data: {
        tenantId: actor.tenantId,
        transporterId: body.transporterId,
        name: body.name,
        truckNumber: body.truckNumber ?? null,
        plateNumber: body.plateNumber ?? null,
        truckBrand: body.truckBrand ?? null,
        model: body.model ?? null,
        truckType: body.truckType ?? null,
        fuelType: body.fuelType ?? null,
        capacityLiters: body.capacityLiters,
      },
      include: {
        transporter: { select: { id: true, name: true } },
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "truck.create",
      tenantId: actor.tenantId,
      targetType: "Truck",
      targetId: truck.id,
      after: { name: truck.name, transporter: truck.transporter.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ truck });
  } catch (e) {
    return handleError(e);
  }
}
