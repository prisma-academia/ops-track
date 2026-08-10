import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateOrderSchema = z.object({
  reference: z.string().max(50).optional().nullable(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersOrdered: z.number().positive(),
  supplier: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable(),
  pricePerLitre: z.number().min(0).default(0),
  loadingCost: z.number().min(0).default(0),
  sendInvitation: z.boolean().default(false),
  transporterId: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  litersRequested: z.number().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
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

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = CreateOrderSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Using a transaction to create both Order and potentially TransportInvitation
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId: actor.tenantId,
          reference: body.reference ?? null,
          productType: body.productType,
          litersOrdered: body.litersOrdered,
          supplier: body.supplier ?? null,
          sourceDepot: body.sourceDepot ?? null,
          pricePerLitre: body.pricePerLitre,
          loadingCost: body.loadingCost,
        },
      });

      if (body.sendInvitation && body.transporterId && body.destination && body.litersRequested > 0) {
        await tx.transportInvitation.create({
          data: {
            tenantId: actor.tenantId,
            orderId: order.id,
            transporterId: body.transporterId as string,
            destination: body.destination as string,
            litersRequested: body.litersRequested,
          }
        });
      }

      return order;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "order.create",
      tenantId: actor.tenantId,
      targetType: "Order",
      targetId: result.id,
      after: { reference: result.reference, productType: result.productType, liters: result.litersOrdered.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ order: result });
  } catch (e) {
    return handleError(e);
  }
}
