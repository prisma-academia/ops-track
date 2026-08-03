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
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  assignments: z.array(z.object({
    transporterId: z.string().min(1),
    truckId: z.string().min(1),
    driverId: z.string().min(1),
    destination: z.string().min(1),
    ratePerLiter: z.number().positive(),
    litersCarried: z.number().positive(),
  })).min(1, "At least one truck assignment is required")
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

    const transports = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: body.orderId, tenantId: actor.tenantId },
        include: { transports: { 
          where: { status: { not: "CANCELLED" } },
          select: { litersCarried: true } 
        } }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const existingLiters = order.transports.reduce((sum, t) => sum + Number(t.litersCarried), 0);
      const newLiters = body.assignments.reduce((sum, a) => sum + a.litersCarried, 0);

      if (existingLiters + newLiters > Number(order.litersOrdered)) {
        throw new Error("Total dispatched liters cannot exceed the ordered quantity.");
      }

      const results = [];
      for (const assignment of body.assignments) {
        const t = await tx.transport.create({
          data: {
            tenantId: actor.tenantId,
            orderId: body.orderId,
            transporterId: assignment.transporterId,
            truckId: assignment.truckId,
            driverId: assignment.driverId,
            destination: assignment.destination,
            productType: body.productType ?? null,
            ratePerLiter: assignment.ratePerLiter,
            litersCarried: assignment.litersCarried,
          },
          include: {
            transporter: { select: { name: true } },
            truck: { select: { name: true } },
          },
        });
        results.push(t);

        await audit({
      module: "FLEET",
          actorType: "TENANT_USER",
          actorId: actor.userId,
          action: "transport.create",
          tenantId: actor.tenantId,
          targetType: "Transport",
          targetId: t.id,
          after: {
            destination: t.destination,
            transporter: t.transporter.name,
            truck: t.truck.name,
            litersCarried: t.litersCarried
          } as object,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return results;
    });

    return ok({ transports });
  } catch (e) {
    return handleError(e);
  }
}
