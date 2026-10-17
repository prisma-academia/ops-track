import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { resolveShortageParty } from "@/lib/fleet/loss-attribution";
import { recomputeTransportLoss } from "@/lib/fleet/transport-volume";
import { syncOrderSupplierShortage } from "@/lib/fleet/supplier-shortage";

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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SALES_WRITE.key, "FLEET");
    const body = DeductShortageSchema.parse(await request.json());
    const meta = requestMeta(request);

    const Delivery = await prisma.delivery.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        transport: {
          include: {
            order: {
              include: { supplierRecord: { select: { supplierType: true } } },
            },
          },
        },
      },
    });

    if (!Delivery) throw new DomainError(404, "not_found", "Delivery not found.");
    if (!Delivery.transport) {
      throw new DomainError(400, "invalid_state", "This Delivery is not linked to a transport.");
    }

    const transport = Delivery.transport;
    const supplierType = transport.order?.supplierRecord?.supplierType ?? null;
    const party = resolveShortageParty(supplierType);

    if (party === "UNCONFIGURED") {
      throw new DomainError(
        400,
        "supplier_type_required",
        "Set the supplier type (Local or Depot) before applying shortage deductions."
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    });
    const settings = parseTenantSettings(tenant?.settingsJson);
    const fleet = settings.fleet;

    if (party === "SUPPLIER") {
      if (!transport.orderId) {
        throw new DomainError(400, "invalid_state", "Delivery is not linked to a supplier order.");
      }
      await prisma.transportLossLog.create({
        data: {
          tenantId: actor.tenantId,
          transportId: transport.id,
          lossType: "SHORTAGE",
          lostQuantity: body.variance,
          expensesIncurred: 0,
          economicImpact: "SUPPLIER_CREDIT",
          source: "DELIVERY_VARIANCE",
          comment: `Supplier credit from delivery ${Delivery.id}`,
        },
      });
      await syncOrderSupplierShortage(prisma, transport.orderId);
    } else {
      const newTotalDeduction = Number(transport.totalDeduction) + body.totalDeduction;
      const netTransportFeePaid = Math.max(
        0,
        Number(transport.netTransportFeePaid) - body.totalDeduction
      );

      await prisma.transport.update({
        where: { id: transport.id },
        data: {
          totalDeduction: newTotalDeduction,
          netTransportFeePaid,
          lossLogs: {
            create: {
              tenantId: actor.tenantId,
              lossType: "SHORTAGE",
              lostQuantity: body.variance,
              expensesIncurred: body.totalDeduction,
              economicImpact: "TRANSPORTER_RECOVERY",
              source: "DELIVERY_VARIANCE",
              comment: `Manual shortage deduction from Delivery ${Delivery.id}`,
            },
          },
        },
      });
      await recomputeTransportLoss(prisma, transport.id, fleet);
    }

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "Delivery.deduct_shortage",
      tenantId: actor.tenantId,
      targetType: "Delivery",
      targetId: Delivery.id,
      before: {} as object,
      after: { deductionAmount: body.totalDeduction, party } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true, party });
  } catch (e) {
    return handleError(e);
  }
}
