import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { reconcileTankCurrentLiters } from "@/lib/inventory/tank-balance";

const UpdateWaybillDippingSchema = z.object({
  tankId: z.string().min(1).optional(),
  beforeLiters: z.coerce.number().nonnegative("Before liters must be a positive number or zero."),
  afterLiters: z.coerce.number().nonnegative("After liters must be a positive number or zero."),
  reason: z.string().trim().min(3, "Please provide a reason for editing this dipping record (at least 3 characters)."),
});

const DeleteWaybillDippingSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a reason for deleting this dipping record (at least 3 characters)."),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dippingId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, dippingId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");

    const canEdit =
      hasPermission(actor, PERMISSIONS.TENANT_WAYBILL_DIPPINGS_WRITE.key) ||
      hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_WRITE.key);

    if (!canEdit) {
      throw new DomainError(403, "forbidden", "You do not have permission to edit waybill dippings.");
    }

    const body = UpdateWaybillDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (body.afterLiters < body.beforeLiters) {
      throw new DomainError(400, "invalid_liters", "After liters must be greater than or equal to before liters.");
    }

    const dipping = await prisma.waybillDipping.findUnique({
      where: { id: dippingId },
      include: {
        waybillAllocation: true,
        waybill: true,
        tank: true,
      },
    });

    if (
      !dipping ||
      dipping.tenantId !== actor.tenantId ||
      (dipping.waybillId !== id && dipping.waybillAllocationId !== id)
    ) {
      throw new DomainError(404, "not_found", "Waybill dipping not found.");
    }

    const targetTankId = body.tankId || dipping.tankId;
    const targetTank = await prisma.tank.findUnique({
      where: { id: targetTankId },
    });

    if (
      !targetTank ||
      targetTank.tenantId !== actor.tenantId ||
      targetTank.stationId !== dipping.waybillAllocation.stationId
    ) {
      throw new DomainError(404, "tank_not_found", "Target tank not found or belongs to a different station.");
    }

    if (targetTank.productType !== dipping.waybill.productType) {
      throw new DomainError(
        400,
        "product_mismatch",
        `Tank "${targetTank.name}" product type (${targetTank.productType}) does not match waybill product (${dipping.waybill.productType}).`
      );
    }

    if (body.afterLiters > Number(targetTank.capacity)) {
      throw new DomainError(
        400,
        "capacity_exceeded",
        `After volume (${body.afterLiters.toLocaleString()} L) exceeds tank "${targetTank.name}" capacity of ${Number(targetTank.capacity).toLocaleString()} L.`
      );
    }

    // Check open dipping sessions on target tank
    const openSessions = await prisma.dippingSession.findMany({
      where: {
        tankId: targetTankId,
        tenantId: actor.tenantId,
        status: "OPEN",
      },
    });
    if (openSessions.length > 0) {
      throw new DomainError(
        400,
        "open_dipping_exists",
        `Close the open dipping session on tank "${targetTank.name}" before updating this waybill drop.`
      );
    }

    const oldBefore = Number(dipping.beforeLiters);
    const oldAfter = dipping.afterLiters != null ? Number(dipping.afterLiters) : 0;
    const oldNet = oldAfter - oldBefore;
    const newNet = body.afterLiters - body.beforeLiters;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update WaybillDipping
      const updatedDipping = await tx.waybillDipping.update({
        where: { id: dippingId },
        data: {
          tankId: targetTankId,
          beforeLiters: body.beforeLiters,
          afterLiters: body.afterLiters,
        },
      });

      // 2. Authoritative recomputation of litersReceived for this allocation
      const allAllocationDippings = await tx.waybillDipping.findMany({
        where: { waybillAllocationId: dipping.waybillAllocationId },
      });
      const totalReceived = allAllocationDippings.reduce((acc, d) => {
        if (d.afterLiters != null) {
          return acc + (Number(d.afterLiters) - Number(d.beforeLiters));
        }
        return acc;
      }, 0);

      await tx.waybillAllocation.update({
        where: { id: dipping.waybillAllocationId },
        data: {
          litersReceived: totalReceived,
        },
      });

      // 3. Sync corresponding Delivery and Transport logistics
      if (dipping.waybillAllocation.deliveryId) {
        const matchingSale = await tx.delivery.findUnique({
          where: { id: dipping.waybillAllocation.deliveryId },
        });

        if (matchingSale) {
          const totalExpectedAmount = totalReceived * Number(matchingSale.amountPerLiter);
          await tx.delivery.update({
            where: { id: matchingSale.id },
            data: {
              litersReceived: totalReceived,
              totalExpectedAmount,
            },
          });

          if (matchingSale.transportId) {
            const transport = await tx.transport.findUnique({
              where: { id: matchingSale.transportId },
            });
            if (transport) {
              const allSales = await tx.delivery.findMany({
                where: { transportId: transport.id },
              });
              const totalDelivered = allSales.reduce((sum, d) => {
                if (d.id === matchingSale.id) return sum + totalReceived;
                return sum + Number(d.litersReceived ?? 0);
              }, 0);

              const litersLost = Math.max(0, Number(transport.litersCarried) - totalDelivered);
              const ratePerLiter = Number(transport.ratePerLiter);
              const cashDeductionForLoss = litersLost * ratePerLiter;
              const totalDeduction = Number(transport.maintenanceCost) + cashDeductionForLoss;
              const netTransportFeePaid = Math.max(
                0,
                ratePerLiter * Number(transport.litersCarried) - totalDeduction
              );

              await tx.transport.update({
                where: { id: transport.id },
                data: { litersDelivered: totalDelivered, litersLost, totalDeduction, netTransportFeePaid },
              });
            }
          }
        }
      }

      // 4. Reconcile tank physical inventory
      await reconcileTankCurrentLiters(tx, dipping.tankId);
      if (targetTankId !== dipping.tankId) {
        await reconcileTankCurrentLiters(tx, targetTankId);
      }

      // 5. Create audit stock movement entry
      const netDelta = targetTankId === dipping.tankId ? newNet - oldNet : newNet;
      if (netDelta !== 0) {
        const currentLevel = (
          await tx.tank.findUnique({
            where: { id: targetTankId },
            select: { currentLiters: true },
          })
        )?.currentLiters ?? new Prisma.Decimal(0);

        await tx.stockMovement.create({
          data: {
            tenantId: actor.tenantId,
            stationId: dipping.waybillAllocation.stationId!,
            tankId: targetTankId,
            movementType: "ADJUSTMENT",
            productType: targetTank.productType,
            quantity: new Prisma.Decimal(netDelta),
            balanceAfter: currentLevel,
            referenceId: dipping.waybillAllocation.deliveryId || dipping.waybillAllocationId,
            referenceType: "WaybillDippingEdit",
            notes: `Corrected waybill discharge dip #${dipping.id.slice(0, 8)} (${oldNet.toLocaleString()} L -> ${newNet.toLocaleString()} L). Reason: ${body.reason}`,
            recordedById: actor.userId,
          },
        });
      }

      return { updatedDipping, totalReceived };
    }, { timeout: 15000 });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill_dipping.edit",
      tenantId: actor.tenantId,
      targetType: "WaybillDipping",
      targetId: dipping.id,
      before: {
        tankId: dipping.tankId,
        beforeLiters: oldBefore,
        afterLiters: oldAfter,
        netDischarged: oldNet,
      } as object,
      after: {
        tankId: targetTankId,
        beforeLiters: body.beforeLiters,
        afterLiters: body.afterLiters,
        netDischarged: newNet,
        totalAllocationReceived: result.totalReceived,
        reason: body.reason,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ dipping: result.updatedDipping, totalReceived: result.totalReceived });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; dippingId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id, dippingId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");

    const canDelete =
      hasPermission(actor, PERMISSIONS.TENANT_WAYBILL_DIPPINGS_WRITE.key) ||
      hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_WRITE.key);

    if (!canDelete) {
      throw new DomainError(403, "forbidden", "You do not have permission to delete waybill dippings.");
    }

    const body = DeleteWaybillDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    const dipping = await prisma.waybillDipping.findUnique({
      where: { id: dippingId },
      include: {
        waybillAllocation: true,
        waybill: true,
        tank: true,
      },
    });

    if (
      !dipping ||
      dipping.tenantId !== actor.tenantId ||
      (dipping.waybillId !== id && dipping.waybillAllocationId !== id)
    ) {
      throw new DomainError(404, "not_found", "Waybill dipping not found.");
    }

    const oldBefore = Number(dipping.beforeLiters);
    const oldAfter = dipping.afterLiters != null ? Number(dipping.afterLiters) : 0;
    const oldNet = oldAfter - oldBefore;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete WaybillDipping
      await tx.waybillDipping.delete({
        where: { id: dippingId },
      });

      // 2. Recompute total received for this allocation
      const remainingAllocationDippings = await tx.waybillDipping.findMany({
        where: { waybillAllocationId: dipping.waybillAllocationId },
      });
      const totalReceived = remainingAllocationDippings.reduce((acc, d) => {
        if (d.afterLiters != null) {
          return acc + (Number(d.afterLiters) - Number(d.beforeLiters));
        }
        return acc;
      }, 0);

      const updateData: { litersReceived: number; status?: "DELIVERED" } = {
        litersReceived: totalReceived,
      };

      // If all dippings deleted and was COMPLETED, revert to DELIVERED
      if (remainingAllocationDippings.length === 0 && dipping.waybillAllocation.status === "COMPLETED") {
        updateData.status = "DELIVERED";
      }

      await tx.waybillAllocation.update({
        where: { id: dipping.waybillAllocationId },
        data: updateData,
      });

      // 3. Sync Delivery and Transport
      if (dipping.waybillAllocation.deliveryId) {
        const matchingSale = await tx.delivery.findUnique({
          where: { id: dipping.waybillAllocation.deliveryId },
        });

        if (matchingSale) {
          const totalExpectedAmount = totalReceived * Number(matchingSale.amountPerLiter);
          await tx.delivery.update({
            where: { id: matchingSale.id },
            data: {
              litersReceived: totalReceived,
              totalExpectedAmount,
            },
          });

          if (matchingSale.transportId) {
            const transport = await tx.transport.findUnique({
              where: { id: matchingSale.transportId },
            });
            if (transport) {
              const allSales = await tx.delivery.findMany({
                where: { transportId: transport.id },
              });
              const totalDelivered = allSales.reduce((sum, d) => {
                if (d.id === matchingSale.id) return sum + totalReceived;
                return sum + Number(d.litersReceived ?? 0);
              }, 0);

              const litersLost = Math.max(0, Number(transport.litersCarried) - totalDelivered);
              const ratePerLiter = Number(transport.ratePerLiter);
              const cashDeductionForLoss = litersLost * ratePerLiter;
              const totalDeduction = Number(transport.maintenanceCost) + cashDeductionForLoss;
              const netTransportFeePaid = Math.max(
                0,
                ratePerLiter * Number(transport.litersCarried) - totalDeduction
              );

              await tx.transport.update({
                where: { id: transport.id },
                data: { litersDelivered: totalDelivered, litersLost, totalDeduction, netTransportFeePaid },
              });
            }
          }
        }
      }

      // 4. Reconcile tank inventory
      await reconcileTankCurrentLiters(tx, dipping.tankId);

      // 5. Log adjustment stock movement
      if (oldNet > 0) {
        const currentLevel = (
          await tx.tank.findUnique({
            where: { id: dipping.tankId },
            select: { currentLiters: true },
          })
        )?.currentLiters ?? new Prisma.Decimal(0);

        await tx.stockMovement.create({
          data: {
            tenantId: actor.tenantId,
            stationId: dipping.waybillAllocation.stationId!,
            tankId: dipping.tankId,
            movementType: "ADJUSTMENT",
            productType: dipping.tank.productType,
            quantity: new Prisma.Decimal(-oldNet),
            balanceAfter: currentLevel,
            referenceId: dipping.waybillAllocation.deliveryId || dipping.waybillAllocationId,
            referenceType: "WaybillDippingDelete",
            notes: `Reversed/deleted waybill discharge dip #${dipping.id.slice(0, 8)} (-${oldNet.toLocaleString()} L). Reason: ${body.reason}`,
            recordedById: actor.userId,
          },
        });
      }

      return { totalReceived, revertedStatus: updateData.status };
    }, { timeout: 15000 });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill_dipping.delete",
      tenantId: actor.tenantId,
      targetType: "WaybillDipping",
      targetId: dipping.id,
      before: {
        tankId: dipping.tankId,
        beforeLiters: oldBefore,
        afterLiters: oldAfter,
        netDischarged: oldNet,
      } as object,
      after: {
        deleted: true,
        totalAllocationReceived: result.totalReceived,
        revertedStatus: result.revertedStatus,
        reason: body.reason,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true, totalReceived: result.totalReceived });
  } catch (e) {
    return handleError(e);
  }
}
