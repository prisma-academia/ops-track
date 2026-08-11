import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const SetPriceSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  pricePerLiter: z.coerce.number().positive(),
  effectiveFrom: z.string().transform((v) => new Date(v)).optional(),
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

    const prices = await prisma.priceControl.findMany({
      where: { stationId, tenantId: actor.tenantId },
      orderBy: { effectiveFrom: "desc" },
    });

    return ok(prices);
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
    const body = SetPriceSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const priceControl = await prisma.priceControl.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        productType: body.productType,
        pricePerLiter: body.pricePerLiter,
        effectiveFrom: body.effectiveFrom ?? new Date(),
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "price_control.create",
      tenantId: actor.tenantId,
      targetType: "PriceControl",
      targetId: priceControl.id,
      after: {
        productType: priceControl.productType,
        pricePerLiter: priceControl.pricePerLiter,
        effectiveFrom: priceControl.effectiveFrom,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ priceControl });
  } catch (e) {
    return handleError(e);
  }
}
