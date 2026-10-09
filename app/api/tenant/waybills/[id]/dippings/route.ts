import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { StockMovementService } from "@/lib/inventory/stock-movement-service";
import { recomputeTransportLoss } from "@/lib/fleet/transport-volume";
const CreateWaybillDippingSchema = z.object({
  dippings: z.array(z.object({
    tankId: z.string().min(1),
    beforeLiters: z.coerce.number().nonnegative(),
    afterLiters: z.coerce.number().nonnegative().optional().nullable(),
    observations: z.string().optional().nullable(),
  })).optional().default([]),
  completeWithShortage: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: waybillAllocationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_WRITE.key, "STATION");
    const body = CreateWaybillDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    const allocation = await prisma.waybillAllocation.findUnique({
      where: { id: waybillAllocationId },
      include: { waybill: true }
    });

    if (!allocation || allocation.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill allocation not found.");
    }

    if (allocation.status !== "DELIVERED") {
      throw new DomainError(400, "invalid_status", "Waybill must be received/delivered before dipping.");
    }

    const uniqueTankIds = Array.from(new Set(body.dippings.map((d) => d.tankId)));
    const existingDipTanks = body.completeWithShortage
      ? await prisma.waybillDipping.findMany({
          where: { waybillAllocationId: allocation.id, tenantId: actor.tenantId },
          select: { tankId: true },
        })
      : [];
    const tankIdsToCheck = Array.from(new Set([
      ...uniqueTankIds,
      ...existingDipTanks.map((d) => d.tankId),
    ]));
    const tanks = await prisma.tank.findMany({
      where: { id: { in: tankIdsToCheck.length > 0 ? tankIdsToCheck : uniqueTankIds } },
    });

    if (body.dippings.length > 0) {
      const bodyTanks = tanks.filter((t) => uniqueTankIds.includes(t.id));
      if (bodyTanks.length !== uniqueTankIds.length || bodyTanks.some(t => t.stationId !== allocation.stationId || t.tenantId !== actor.tenantId)) {
        throw new DomainError(404, "not_found", "One or more tanks not found or belong to a different station.");
      }

      const openSessions = await prisma.dippingSession.findMany({
        where: {
          tankId: { in: uniqueTankIds },
          tenantId: actor.tenantId,
          status: "OPEN",
        },
        include: { tank: { select: { name: true } } },
      });
      if (openSessions.length > 0) {
        const names = Array.from(new Set(openSessions.map((s) => s.tank.name))).join(", ");
        throw new DomainError(
          400,
          "open_dipping_exists",
          `Close the open dipping session on tank${openSessions.length > 1 ? "s" : ""} ${names} before recording a waybill drop.`
        );
      }

    }

    for (const tankId of tankIdsToCheck) {
      const lastSessionForBlock = await prisma.dippingSession.findFirst({
        where: { tankId, tenantId: actor.tenantId },
        orderBy: { openedAt: "desc" },
        include: { closings: true },
      });

      if (lastSessionForBlock && lastSessionForBlock.closings.length > 0) {
        const closingIds = lastSessionForBlock.closings.map(c => c.id);
        const pendingSales = await prisma.salesLog.findFirst({
          where: {
            dippingClosingId: { in: closingIds },
            status: { notIn: ["APPROVED"] },
          },
        });

        if (pendingSales) {
          const tank = tanks.find(t => t.id === tankId);
          throw new DomainError(
            400,
            "pending_sales_exists",
            `Cannot discharge into tank "${tank?.name ?? "selected tank"}": There are unapproved or rejected sales from its previous dipping session. Please approve or resolve them first. Remaining space does not include those sales.`
          );
        }
      }
    }

    // Validate capacity limits before entering transaction
    for (const dip of body.dippings) {
      if (dip.afterLiters !== null && dip.afterLiters !== undefined) {
        const tank = tanks.find(t => t.id === dip.tankId)!;
        if (dip.afterLiters > Number(tank.capacity)) {
          throw new DomainError(400, "capacity_exceeded", `After volume (${dip.afterLiters} L) exceeds tank "${tank.name}" capacity of ${Number(tank.capacity).toLocaleString()} L.`);
        }
        const netAdded = dip.afterLiters - dip.beforeLiters;
        if (netAdded > 0) {
          const newLevel = Number(tank.currentLiters) + netAdded;
          if (newLevel > Number(tank.capacity)) {
            throw new DomainError(400, "capacity_exceeded", `Discharged volume would push tank "${tank.name}" to ${newLevel.toLocaleString()} L, exceeding capacity of ${Number(tank.capacity).toLocaleString()} L.`);
          }
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdDippings = [];
      let totalNetDischarged = 0;

      for (const dip of body.dippings) {
        const dipping = await tx.waybillDipping.create({
          data: {
            tenantId: actor.tenantId,
            waybillId: allocation.waybillId,
            waybillAllocationId: allocation.id,
            tankId: dip.tankId,
            beforeLiters: dip.beforeLiters,
            afterLiters: dip.afterLiters ?? null,
            observations: dip.observations || null,
            recordedById: actor.userId,
          },
        });
        createdDippings.push(dipping);

        if (dip.afterLiters !== null && dip.afterLiters !== undefined) {
          const netAdded = Number(dip.afterLiters) - Number(dip.beforeLiters);
          totalNetDischarged += netAdded;

          // Update tank currentLiters explicitly to avoid Decimal increment issues
          if (netAdded !== 0) {
            const tank = await tx.tank.findUnique({ where: { id: dip.tankId } });
            if (tank) {
              await StockMovementService.recordDeliveryDrop(tx as any, {
                tenantId: actor.tenantId,
                stationId: allocation.stationId!,
                tankId: dip.tankId,
                productType: tank.productType,
                quantity: netAdded,
                referenceId: allocation.deliveryId || allocation.id,
                recordedById: actor.userId,
                notes: `Delivery drop from Waybill Allocation ${allocation.id}`,
              });
            }
          }
        }
      }

      const currentReceived = Number(allocation.litersReceived ?? 0) + totalNetDischarged;
      const shouldComplete = body.completeWithShortage === true;

      const updateData: any = {};
      if (totalNetDischarged > 0 || body.dippings.some(d => d.afterLiters !== null && d.afterLiters !== undefined)) {
        updateData.litersReceived = currentReceived;
      }
      if (shouldComplete) {
        updateData.status = "COMPLETED";
      }

      if (Object.keys(updateData).length > 0) {
        await tx.waybillAllocation.update({
          where: { id: waybillAllocationId },
          data: updateData,
        });
      }

      // Sync with corresponding Delivery unconditionally
      const matchingSale = allocation.deliveryId ? await tx.delivery.findUnique({
        where: { id: allocation.deliveryId }
      }) : null;

      if (matchingSale) {
        const totalExpectedAmount = currentReceived * Number(matchingSale.amountPerLiter);

        await tx.delivery.update({
          where: { id: matchingSale.id },
          data: {
            litersReceived: currentReceived,
            totalExpectedAmount,
          }
        });

        // Recalculate transport loss (open transports only; never overwrites logged losses)
        if (matchingSale.transportId) {
          await recomputeTransportLoss(tx, matchingSale.transportId);
        }
      }


      return { createdDippings, completed: shouldComplete, variance: Number(allocation.litersToDispense) - currentReceived };
    }, { timeout: 15000 });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill_dipping.record",
      tenantId: actor.tenantId,
      targetType: "WaybillDipping",
      targetId: result.createdDippings[0]?.id || waybillAllocationId,
      after: {
        waybillAllocationId,
        waybillId: allocation.waybillId,
        dippingsCount: body.dippings.length,
        dippings: body.dippings,
        completed: result.completed,
        variance: result.variance,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ dippings: result.createdDippings, completed: result.completed, variance: result.variance });
  } catch (e) {
    return handleError(e);
  }
}
