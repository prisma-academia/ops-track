import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateSaleSchema = z.object({
  litersReceived: z.number().min(0).optional(),
  amountPerLiter: z.number().positive().optional(),
  litersDespatched: z.number().positive().optional(),
  status: z.enum(["UNPAID", "PART_PAID", "CLEARED"]).optional(),
  transportRate: z.number().min(0).optional(),
  transportCost: z.number().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const sale = await prisma.sale.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        customer: true,
        transport: {
          include: {
            transporter: { select: { id: true, name: true } },
            truck: { select: { id: true, name: true } },
          },
        },
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!sale) throw new DomainError(404, "not_found", "Sale not found.");
    return ok({ sale });
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
    const body = UpdateSaleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.sale.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Sale not found.");

    const newLitersReceived = body.litersReceived ?? Number(existing.litersReceived ?? 0);
    const newAmountPerLiter = body.amountPerLiter ?? Number(existing.amountPerLiter);
    const totalExpectedAmount = newLitersReceived * newAmountPerLiter;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        ...(body.litersReceived !== undefined && { litersReceived: body.litersReceived }),
        ...(body.amountPerLiter !== undefined && { amountPerLiter: body.amountPerLiter }),
        ...(body.litersDespatched !== undefined && { litersDespatched: body.litersDespatched }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.transportRate !== undefined && { transportRate: body.transportRate }),
        ...(body.transportCost !== undefined && { transportCost: body.transportCost }),
        totalExpectedAmount,
      },
    });

    // Cross-model reconciliation: if linked to a transport, recalculate loss
    if (sale.transportId) {
      const transport = await prisma.transport.findUnique({ where: { id: sale.transportId } });
      if (transport) {
        const allSales = await prisma.sale.findMany({
          where: { transportId: transport.id },
          include: { station: true }
        });
        
        let totalReceived = allSales.reduce(
          (sum, s) => sum + Number(s.litersReceived ?? 0), 0
        );

        // Add volume from custom distributions in subsequentLocs
        const subsequentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
        const salesStationNames = allSales.map((s) => s.station?.name).filter(Boolean);
        const customDistributions = subsequentLocs.filter((loc: any) => loc.isCustom || loc.productPrice !== undefined || (!loc.saleId && !salesStationNames.includes(loc.location)));
        const locsVol = customDistributions.reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
        
        totalReceived += locsVol;

        const litersLost = Math.max(0, Number(transport.litersCarried) - totalReceived);
        const ratePerLiter = Number(transport.ratePerLiter);
        const cashDeductionForLoss = litersLost * ratePerLiter;
        const existingMaintenance = Number(transport.maintenanceCost);
        const totalDeduction = existingMaintenance + cashDeductionForLoss;
        const baseRate = ratePerLiter * Number(transport.litersCarried);
        const netTransportFeePaid = Math.max(0, baseRate - totalDeduction);

        await prisma.transport.update({
          where: { id: transport.id },
          data: { litersDelivered: totalReceived, litersLost, totalDeduction, netTransportFeePaid },
        });
      }
    }

    // Sync with WaybillAllocation if it's a station
    if (sale.stationId && body.transportCost !== undefined) {
      const activeAllocation = await prisma.waybillAllocation.findFirst({
        where: {
          tenantId: actor.tenantId,
          saleId: sale.id,
        },
        orderBy: { createdAt: "desc" },
      });

      if (activeAllocation) {
        await prisma.waybillAllocation.update({
          where: { id: activeAllocation.id },
          data: { transportationCost: body.transportCost }
        });
      }
    }

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sale.update",
      tenantId: actor.tenantId,
      targetType: "Sale",
      targetId: sale.id,
      before: { litersReceived: existing.litersReceived?.toString() } as object,
      after: { litersReceived: sale.litersReceived?.toString(), totalExpected: sale.totalExpectedAmount.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ sale });
  } catch (e) {
    return handleError(e);
  }
}
