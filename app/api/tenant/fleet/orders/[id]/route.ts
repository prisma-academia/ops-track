import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "LOADED", "CHANGED", "CANCELLED", "COMPLETED"]).optional(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional(),
  litersOrdered: z.number().positive().optional(),
  supplier: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable(),
  pricePerLitre: z.number().min(0).optional(),
  loadingCost: z.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const { id } = await params;
    const body = UpdateOrderSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.order.findUnique({
      where: { id, tenantId: actor.tenantId },
    });

    if (!existing) {
      return new Response("Order not found", { status: 404 });
    }

    let newReference = existing.reference;
    if (body.productType && body.productType !== existing.productType && existing.reference) {
      newReference = existing.reference.replace(`-${existing.productType}-`, `-${body.productType}-`);
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.productType && { productType: body.productType }),
        ...(newReference !== existing.reference && { reference: newReference }),
        ...(body.litersOrdered && { litersOrdered: body.litersOrdered }),
        ...(body.supplier !== undefined && { supplier: body.supplier }),
        ...(body.sourceDepot !== undefined && { sourceDepot: body.sourceDepot }),
        ...(body.pricePerLitre !== undefined && { pricePerLitre: body.pricePerLitre }),
        ...(body.loadingCost !== undefined && { loadingCost: body.loadingCost }),
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "order.update",
      tenantId: actor.tenantId,
      targetType: "Order",
      targetId: order.id,
      before: { status: existing.status, productType: existing.productType, liters: existing.litersOrdered.toString() } as object,
      after: { status: order.status, productType: order.productType, liters: order.litersOrdered.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ order });
  } catch (e) {
    return handleError(e);
  }
}
