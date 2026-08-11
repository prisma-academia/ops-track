import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";


const CreateTransportFulfillSchema = z.object({
  orderId: z.string().min(1),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  invitationId: z.string().optional().nullable(),
  assignments: z.array(z.object({
    transporterId: z.string().min(1),
    truckId: z.string().min(1),
    driverId: z.string().min(1),
    destination: z.string().min(1),
    ratePerLiter: z.coerce.number().min(0),
    litersCarried: z.coerce.number().positive(),
  })).min(1, "At least one truck assignment is required")
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const body = CreateTransportFulfillSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transports = await prisma.$transaction(async (tx) => {
      // 1. Verify the order exists and has enough capacity
      const order = await tx.order.findUnique({
        where: { id: body.orderId, tenantId: actor.tenantId },
        include: { transports: { 
          where: { status: { not: "CANCELLED" } },
          select: { litersCarried: true } 
        } }
      });

      if (!order) {
        throw new DomainError(404, "not_found", "Order not found");
      }

      const existingLiters = order.transports.reduce((sum, t) => sum + Number(t.litersCarried), 0);
      const newLiters = body.assignments.reduce((sum, a) => sum + a.litersCarried, 0);

      if (existingLiters + newLiters > Number(order.litersOrdered)) {
        throw new DomainError(400, "capacity_exceeded", "Total dispatched liters cannot exceed the ordered quantity.");
      }

      if (body.invitationId) {
        await tx.transportInvitation.update({
          where: { id: body.invitationId },
          data: { status: "ACCEPTED", respondedAt: new Date() }
        });
      }

      // 4. Create transports and link requests
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
            truck: { select: { name: true, plateNumber: true } },
            driver: { select: { firstName: true, lastName: true, phone: true } }
          },
        });



        results.push(t);

        await audit({
      module: "FLEET",
          actorType: "TENANT_USER",
          actorId: actor.userId,
          action: "transport.create_with_fulfillment",
          tenantId: actor.tenantId,
          targetType: "Transport",
          targetId: t.id,
          after: {
            destination: t.destination,
            litersCarried: t.litersCarried
          } as object,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return results;
    }, { maxWait: 5000, timeout: 20000 });

    return ok({ transports });
  } catch (e) {
    return handleError(e);
  }
}
