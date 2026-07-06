import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateOrderSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional(),
  litersOrdered: z.number().positive().optional(),
  sourceDepot: z.string().optional().nullable(),
  orderCost: z.number().min(0).optional(),
  loadingCost: z.number().min(0).optional(),
  transportCost: z.number().min(0).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CHANGED", "CANCELLED"]).optional(),
  cashEquivalentReturned: z.number().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const order = await prisma.order.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        transports: {
          include: {
            transporter: { select: { id: true, name: true } },
            truck: { select: { id: true, name: true } },
            driver: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) throw new DomainError(404, "not_found", "Order not found.");
    return ok({ order });
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
    const body = UpdateOrderSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.order.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Order not found.");

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.productType !== undefined && { productType: body.productType }),
        ...(body.litersOrdered !== undefined && { litersOrdered: body.litersOrdered }),
        ...(body.sourceDepot !== undefined && { sourceDepot: body.sourceDepot }),
        ...(body.orderCost !== undefined && { orderCost: body.orderCost }),
        ...(body.loadingCost !== undefined && { loadingCost: body.loadingCost }),
        ...(body.transportCost !== undefined && { transportCost: body.transportCost }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "order.update",
      tenantId: actor.tenantId,
      targetType: "Order",
      targetId: order.id,
      before: { status: existing.status } as object,
      after: { status: order.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ order });
  } catch (e) {
    return handleError(e);
  }
}
