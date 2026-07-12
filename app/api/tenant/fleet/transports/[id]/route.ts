import { z } from "zod";

import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const SubsequentLocSchema = z.object({
  location: z.string(),
  rate: z.number(),
  litersDelivered: z.number(),
  date: z.string().optional(),
  isCustom: z.boolean().optional(),
  productPrice: z.number().optional()
});

const UpdateTransportSchema = z.object({
  litersDelivered: z.number().min(0).optional(),
  subsequentLocs: z.array(SubsequentLocSchema).optional(),
  addMaintenanceCost: z.number().min(0).optional(),
  addLitersLost: z.number().min(0).optional(),
  addDeposit: z.number().min(0).optional(),
  status: z.enum(["IN_TRANSIT", "COMPLETED", "CANCELLED", "LOSS"]).optional(),
  lossLog: z.object({
    lossType: z.enum(["THEFT", "MAINTENANCE", "ACCIDENT", "OTHERS"]),
    lostQuantity: z.number().min(0),
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const transport = await prisma.transport.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        order: true,
        transporter: true,
        truck: true,
        driver: true,
        sales: {
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = UpdateTransportSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.transport.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Transport not found.");

    // Calculate financials
    const ratePerLiter = Number(existing.ratePerLiter);
    const litersCarried = Number(existing.litersCarried);

    // Base earnings
    let baseRate = ratePerLiter * litersCarried;

    // Extra earnings from subsequent locations
    const subsequentLocs = body.subsequentLocs ?? (existing.subsequentLocs as any[] ?? []);
    for (const loc of subsequentLocs) {
      baseRate += (loc.rate ?? 0) * (loc.litersDelivered ?? 0);
    }

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
        ...(body.litersDelivered !== undefined && { litersDelivered: body.litersDelivered }),
        ...(body.subsequentLocs !== undefined && { subsequentLocs: body.subsequentLocs as any }),
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
