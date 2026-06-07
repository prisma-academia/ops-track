import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { ProductType } from "@/lib/generated/prisma/client";

const BulkPriceSchema = z.object({
  prices: z.object({
    PMS: z.coerce.number().positive().optional(),
    AGO: z.coerce.number().positive().optional(),
    DPK: z.coerce.number().positive().optional(),
    LPG: z.coerce.number().positive().optional(),
  }).refine((data) => Object.keys(data).length > 0, "At least one price must be provided"),
  stationIds: z.array(z.string().uuid()).min(1),
  effectiveFrom: z.string().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);
    const body = BulkPriceSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify all stations belong to tenant
    const stations = await prisma.station.findMany({
      where: {
        id: { in: body.stationIds },
        tenantId: actor.tenantId,
      },
    });

    if (stations.length !== body.stationIds.length) {
      throw new DomainError(400, "invalid_stations", "One or more stations are invalid or do not belong to you.");
    }

    const effectiveDate = body.effectiveFrom ? new Date(body.effectiveFrom) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const stationId of body.stationIds) {
        for (const [productTypeStr, price] of Object.entries(body.prices)) {
          if (price !== undefined) {
            const pc = await tx.priceControl.create({
              data: {
                tenantId: actor.tenantId,
                stationId,
                productType: productTypeStr as ProductType,
                pricePerLiter: price,
                effectiveFrom: effectiveDate,
              },
            });
            created.push(pc);
          }
        }
      }
      return created;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "price_control.bulk_create",
      tenantId: actor.tenantId,
      targetType: "PriceControl",
      targetId: "bulk",
      after: {
        prices: body.prices,
        stationIds: body.stationIds,
        effectiveFrom: effectiveDate,
        count: result.length,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ count: result.length, prices: result });
  } catch (e) {
    return handleError(e);
  }
}
