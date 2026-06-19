import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateWaybillDippingSchema = z.object({
  dippings: z.array(z.object({
    tankId: z.string().min(1),
    beforeLiters: z.coerce.number().nonnegative(),
    afterLiters: z.coerce.number().nonnegative().optional().nullable(),
  })).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: waybillId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);
    const body = CreateWaybillDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    const waybill = await prisma.waybill.findUnique({
      where: { id: waybillId },
    });

    if (!waybill || waybill.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill not found.");
    }

    if (waybill.status !== "DELIVERED") {
      throw new DomainError(400, "invalid_status", "Waybill must be received/delivered before dipping.");
    }

    const uniqueTankIds = Array.from(new Set(body.dippings.map((d) => d.tankId)));
    const tanks = await prisma.tank.findMany({
      where: { id: { in: uniqueTankIds } },
    });

    if (tanks.length !== uniqueTankIds.length || tanks.some(t => t.stationId !== waybill.stationId || t.tenantId !== actor.tenantId)) {
      throw new DomainError(404, "not_found", "One or more tanks not found or belong to a different station.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdDippings = [];
      let totalNetDischarged = 0;

      for (const dip of body.dippings) {
        const dipping = await tx.waybillDipping.create({
          data: {
            tenantId: actor.tenantId,
            waybillId,
            tankId: dip.tankId,
            beforeLiters: dip.beforeLiters,
            afterLiters: dip.afterLiters ?? null,
            recordedById: actor.userId,
          },
        });
        createdDippings.push(dipping);

        if (dip.afterLiters !== null && dip.afterLiters !== undefined) {
          totalNetDischarged += Number(dip.afterLiters) - Number(dip.beforeLiters);
        }
      }

      if (totalNetDischarged > 0 || body.dippings.some(d => d.afterLiters !== null && d.afterLiters !== undefined)) {
        await tx.waybill.update({
          where: { id: waybillId },
          data: {
            litersReceived: waybill.litersReceived !== null 
              ? { increment: totalNetDischarged }
              : totalNetDischarged,
          },
        });
      }

      return createdDippings;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill_dipping.record",
      tenantId: actor.tenantId,
      targetType: "WaybillDipping",
      targetId: result[0]?.id || waybillId,
      after: {
        waybillId,
        dippingsCount: body.dippings.length,
        dippings: body.dippings,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ dippings: result });
  } catch (e) {
    return handleError(e);
  }
}
