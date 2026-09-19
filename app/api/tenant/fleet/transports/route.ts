import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { assertOrderLinkCapacity, asOrderLookupClient } from "@/lib/fleet/transport-order";

const CreateTransportSchema = z.object({
  orderId: z.string().optional().nullable(),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  assignments: z.array(z.object({
    transporterId: z.string().nullish().or(z.literal("")),
    truckId: z.string().nullish().or(z.literal("")),
    driverId: z.string().nullish().or(z.literal("")),
    isOneTime: z.boolean().default(false).optional(),
    oneTimeTransporterName: z.string().optional().nullable(),
    oneTimeTruckPlate: z.string().optional().nullable(),
    oneTimeDriverName: z.string().optional().nullable(),
    destination: z.string().min(1),
    ratePerLiter: z.number().positive(),
    litersCarried: z.number().positive(),
  })).min(1, "At least one truck assignment is required").superRefine((data, ctx) => {
    data.forEach((assignment, index) => {
      if (assignment.isOneTime) {
        if (!assignment.oneTimeTransporterName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Transporter name is required for one-time assignment", path: [index, "oneTimeTransporterName"] });
        }
        if (!assignment.oneTimeTruckPlate) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Truck plate is required for one-time assignment", path: [index, "oneTimeTruckPlate"] });
        }
        if (!assignment.oneTimeDriverName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Driver name is required for one-time assignment", path: [index, "oneTimeDriverName"] });
        }
      } else {
        if (!assignment.transporterId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Transporter ID is required", path: [index, "transporterId"] });
        }
      }
    });
  })
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_READ.key, "FLEET");
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
        _count: { select: { deliveries: true } },
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRANSPORTS_WRITE.key, "FLEET");
    const body = CreateTransportSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transports = await prisma.$transaction(async (tx) => {
      const newLiters = body.assignments.reduce((sum, a) => sum + a.litersCarried, 0);

      if (body.orderId) {
        await assertOrderLinkCapacity(asOrderLookupClient(tx), actor.tenantId, body.orderId, newLiters);
      }

      const results = [];
      for (const assignment of body.assignments) {
        const t = await tx.transport.create({
          data: {
            tenantId: actor.tenantId,
            orderId: body.orderId ?? null,
            transporterId: assignment.isOneTime ? null : assignment.transporterId,
            truckId: assignment.isOneTime ? null : assignment.truckId,
            driverId: assignment.isOneTime ? null : assignment.driverId,
            isOneTime: !!assignment.isOneTime,
            oneTimeTransporterName: assignment.oneTimeTransporterName ?? null,
            oneTimeTruckPlate: assignment.oneTimeTruckPlate ?? null,
            oneTimeDriverName: assignment.oneTimeDriverName ?? null,
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
            transporter: t.isOneTime ? t.oneTimeTransporterName : t.transporter?.name,
            truck: t.isOneTime ? t.oneTimeTruckPlate : (t.truck?.name || "Any Truck"),
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
