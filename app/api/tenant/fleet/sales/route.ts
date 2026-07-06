import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateSaleSchema = z.object({
  customerId: z.string().min(1),
  transportId: z.string().optional().nullable(),
  litersDespatched: z.number().positive(),
  litersReceived: z.number().min(0).optional().nullable(),
  amountPerLiter: z.number().positive(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status");

    const rows = await prisma.sale.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        customer: { select: { id: true, name: true } },
        transport: {
          select: {
            id: true,
            truck: { select: { id: true, name: true } },
            transporter: { select: { id: true, name: true } },
          },
        },
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
    const body = CreateSaleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const litersReceived = body.litersReceived ?? 0;
    const totalExpectedAmount = litersReceived * body.amountPerLiter;

    const sale = await prisma.sale.create({
      data: {
        tenantId: actor.tenantId,
        customerId: body.customerId,
        transportId: body.transportId ?? null,
        litersDespatched: body.litersDespatched,
        litersReceived: body.litersReceived ?? null,
        amountPerLiter: body.amountPerLiter,
        totalExpectedAmount,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sale.create",
      tenantId: actor.tenantId,
      targetType: "Sale",
      targetId: sale.id,
      after: { customer: sale.customer.name, totalExpected: totalExpectedAmount } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ sale });
  } catch (e) {
    return handleError(e);
  }
}
