import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateTransportSchema = z.object({
  orderId: z.string().min(1),
  transporterId: z.string().min(1),
  truckId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  destination: z.string().min(1),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  ratePerLiter: z.number().positive(),
  litersCarried: z.number().positive(),
  comment: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status");

    const rows = await prisma.transport.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        order: { select: { id: true, reference: true, productType: true } },
        transporter: { select: { id: true, name: true } },
        truck: { select: { id: true, name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { sales: true } },
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
    const body = CreateTransportSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transport = await prisma.transport.create({
      data: {
        tenantId: actor.tenantId,
        orderId: body.orderId,
        transporterId: body.transporterId,
        truckId: body.truckId,
        driverId: body.driverId ?? null,
        destination: body.destination,
        productType: body.productType ?? null,
        ratePerLiter: body.ratePerLiter,
        litersCarried: body.litersCarried,
        comment: body.comment ?? null,
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
      action: "transport.create",
      tenantId: actor.tenantId,
      targetType: "Transport",
      targetId: transport.id,
      after: {
        destination: transport.destination,
        transporter: transport.transporter.name,
        truck: transport.truck.name,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transport });
  } catch (e) {
    return handleError(e);
  }
}
