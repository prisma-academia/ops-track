import { z } from "zod";

import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { assertOrderLinkCapacity, asOrderLookupClient } from "@/lib/fleet/transport-order";
import { PRODUCT_LOSS_TYPE_VALUES, isNotesRequiredForLossType } from "@/lib/fleet/loss-types";

const UpdateTransportSchema = z.object({
  orderId: z.string().nullable().optional(),
  litersDelivered: z.number().min(0).optional(),
  addMaintenanceCost: z.number().min(0).optional(),
  addLitersLost: z.number().min(0).optional(),
  addDeposit: z.number().min(0).optional(),
  status: z.enum(["IN_TRANSIT", "COMPLETED", "CANCELLED", "LOSS"]).optional(),
  lossLog: z.object({
    lossType: z.enum(PRODUCT_LOSS_TYPE_VALUES),
    lostQuantity: z.number().positive(),
    expensesIncurred: z.number().min(0),
    comment: z.string().optional()
  }).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_READ.key, "FLEET");

    const transport = await prisma.transport.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        order: true,
        transporter: true,
        truck: true,
        driver: true,
        deliveries: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!transport) throw new DomainError(404, "not_found", "Transport not found.");
    return ok({ transport });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_WRITE.key, "FLEET");
    const body = UpdateTransportSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.transport.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Transport not found.");

    if (body.orderId !== undefined && body.orderId !== existing.orderId) {
      if (body.orderId) {
        await assertOrderLinkCapacity(
          asOrderLookupClient(prisma),
          actor.tenantId,
          body.orderId,
          Number(existing.litersCarried),
          existing.id
        );
      }
    }

    if (body.lossLog) {
      if (isNotesRequiredForLossType(body.lossLog.lossType) && !body.lossLog.comment?.trim()) {
        throw new DomainError(400, "invalid_input", "Please describe what happened.");
      }

      const loggedLost = await prisma.transportLossLog.aggregate({
        where: { transportId: existing.id, tenantId: actor.tenantId },
        _sum: { lostQuantity: true },
      });
      const lostSoFar = Number(loggedLost._sum.lostQuantity ?? 0);
      const loadedVolume = Number(existing.litersCarried);
      if (lostSoFar + body.lossLog.lostQuantity > loadedVolume + 0.001) {
        throw new DomainError(
          400,
          "invalid_input",
          `Lost quantity cannot exceed the ${loadedVolume.toLocaleString()} L loaded on this trip.`
        );
      }
    }

    let finalLitersDelivered = body.litersDelivered ?? (existing.litersDelivered ? Number(existing.litersDelivered) : undefined);

    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      const deliveries = await prisma.delivery.findMany({
        where: { transportId: existing.id, tenantId: actor.tenantId },
        include: { waybillAllocations: true }
      });

      let sumReceived = 0;
      let allAllocationsCompleted = true;
      let hasAllocations = false;

      for (const delivery of deliveries) {
        for (const alloc of delivery.waybillAllocations) {
          hasAllocations = true;
          sumReceived += Number(alloc.litersReceived ?? 0);
          if (alloc.status !== "COMPLETED" && alloc.status !== "CANCELLED") {
            allAllocationsCompleted = false;
          }
        }
      }

      if (hasAllocations) {
        if (!allAllocationsCompleted) {
          throw new DomainError(400, "invalid_state", "All associated waybills must be COMPLETED or CANCELLED before completing this transport.");
        }
        
        // Reconcile the delivered volume based on actual received at stations
        finalLitersDelivered = sumReceived;
      }
    }

    // Calculate financials
    const ratePerLiter = Number(existing.ratePerLiter);
    const litersCarried = Number(existing.litersCarried);

    // Base earnings
    let baseRate = ratePerLiter * litersCarried;

    // Deductions
    const currentMaintenance = Number(existing.maintenanceCost) + (body.addMaintenanceCost ?? 0);
    const currentLitersLost = Number(existing.litersLost) + (body.addLitersLost ?? 0);
    const deductionFromLitersLost = currentLitersLost * ratePerLiter;
    const totalDeduction = deductionFromLitersLost + currentMaintenance;

    // Net payout
    const netTransportFeePaid = Math.max(0, baseRate - totalDeduction);

    const transport = await prisma.transport.update({
      where: { id },
      data: {
        ...(body.orderId !== undefined && { orderId: body.orderId }),
        ...(finalLitersDelivered !== undefined && { litersDelivered: finalLitersDelivered }),
        maintenanceCost: currentMaintenance,
        litersLost: currentLitersLost,
        totalDeduction,
        netTransportFeePaid,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.lossLog && {
          lossLogs: {
            create: {
              tenantId: actor.tenantId,
              lossType: body.lossLog.lossType,
              lostQuantity: body.lossLog.lostQuantity,
              expensesIncurred: body.lossLog.expensesIncurred,
              comment: body.lossLog.comment,
            }
          }
        })
      },
      include: {
        transporter: { select: { id: true, name: true } },
        truck: { select: { id: true, name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport.update",
      tenantId: actor.tenantId,
      targetType: "Transport",
      targetId: transport.id,
      before: { status: existing.status } as object,
      after: { status: transport.status, netTransportFeePaid: transport.netTransportFeePaid.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transport });
  } catch (e) {
    return handleError(e);
  }
}
