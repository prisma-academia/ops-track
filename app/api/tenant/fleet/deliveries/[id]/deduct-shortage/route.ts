import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const DeductShortageSchema = z.object({
  variance: z.number().min(0),
  pricePerLiter: z.number().positive(),
  totalDeduction: z.number().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const body = DeductShortageSchema.parse(await request.json());
    const meta = requestMeta(request);

    const Delivery = await prisma.delivery.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { transport: true }
    });

    if (!Delivery) throw new DomainError(404, "not_found", "Delivery not found.");
    if (!Delivery.transport) throw new DomainError(400, "invalid_state", "This Delivery is not linked to a transport.");

    const transport = Delivery.transport;

    // Add this new deduction to the existing maintenance/deduction fields or recalculate totalDeduction directly.
    // For manual shortage deduction, we increase the totalDeduction and decrease netTransportFeePaid.
    const newTotalDeduction = Number(transport.totalDeduction) + body.totalDeduction;
    const netTransportFeePaid = Math.max(0, Number(transport.netTransportFeePaid) - body.totalDeduction);

    const updatedTransport = await prisma.transport.update({
      where: { id: transport.id },
      data: {
        totalDeduction: newTotalDeduction,
        netTransportFeePaid: netTransportFeePaid,
        // Optional: you can log this in lossLogs as well
        lossLogs: {
          create: {
            tenantId: actor.tenantId,
            lossType: "OTHERS",
            lostQuantity: body.variance,
            expensesIncurred: body.totalDeduction,
            comment: `Manual shortage deduction from Delivery ${Delivery.id}`
          }
        }
      }
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "Delivery.deduct_shortage",
      tenantId: actor.tenantId,
      targetType: "Delivery",
      targetId: Delivery.id,
      before: {} as object,
      after: { deductionAmount: body.totalDeduction } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true, transport: updatedTransport });
  } catch (e) {
    return handleError(e);
  }
}
