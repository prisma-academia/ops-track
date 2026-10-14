import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { upsertSupplierByName, serializeOrderPayables } from "@/lib/fleet/suppliers";

const toUppercaseOrNull = (val: string | null | undefined) => {
  if (val == null) return null;
  const trimmed = val.trim();
  if (trimmed === "") return null;
  return trimmed.toUpperCase();
};

const CreateOrderSchema = z.object({
  reference: z.string().max(50).optional().nullable(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersOrdered: z.number().positive(),
  supplier: z.string().optional().nullable().transform(toUppercaseOrNull),
  supplierId: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable().transform(toUppercaseOrNull),
  pricePerLitre: z.number().min(0).default(0),
  loadingCostPerLitre: z.number().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key, "FLEET");
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status");

    const rows = await prisma.order.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: { select: { transports: true } },
      },
    });

    const serialized = rows.map((o) => ({
      ...o,
      ...serializeOrderPayables(o),
      litersOrdered: Number(o.litersOrdered),
      pricePerLitre: Number(o.pricePerLitre),
      loadingCostPerLitre: Number(o.loadingCostPerLitre),
    }));

    return ok(serialized, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_ORDERS_WRITE.key, "FLEET");
    const body = CreateOrderSchema.parse(await request.json());
    const meta = requestMeta(request);

    const order = await prisma.$transaction(async (tx) => {
      let supplierId = body.supplierId ?? null;
      let supplierName = body.supplier ?? null;
      if (!supplierId && supplierName) {
        const supplier = await upsertSupplierByName(tx, actor.tenantId, supplierName);
        supplierId = supplier?.id ?? null;
        supplierName = supplier?.name ?? supplierName;
      } else if (supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: supplierId, tenantId: actor.tenantId },
        });
        if (supplier) supplierName = supplier.name;
      }

      return tx.order.create({
        data: {
          tenantId: actor.tenantId,
          reference: body.reference ?? null,
          productType: body.productType,
          litersOrdered: body.litersOrdered,
          supplier: supplierName,
          supplierId,
          sourceDepot: body.sourceDepot ?? null,
          pricePerLitre: body.pricePerLitre,
          loadingCostPerLitre: body.loadingCostPerLitre,
        },
      });
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "order.create",
      tenantId: actor.tenantId,
      targetType: "Order",
      targetId: order.id,
      after: { reference: order.reference, productType: order.productType, liters: order.litersOrdered.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ order });
  } catch (e) {
    return handleError(e);
  }
}
