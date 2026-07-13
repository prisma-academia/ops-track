import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const StationAllocationSchema = z.object({
  requestId: z.string().min(1),
  stationId: z.string().min(1),
  allocatedLiters: z.coerce.number().positive(),
});

const CreateTransportFulfillSchema = z.object({
  orderId: z.string().min(1),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  assignments: z.array(z.object({
    transporterId: z.string().min(1),
    truckId: z.string().min(1),
    driverId: z.string().min(1),
    destination: z.string().min(1),
    ratePerLiter: z.coerce.number().min(0),
    litersCarried: z.coerce.number().positive(),
    stationAllocations: z.array(StationAllocationSchema).optional().default([]),
  })).min(1, "At least one truck assignment is required")
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
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

      // 2. Aggregate all request allocations across all trucks to validate against request totals
      const requestTotals = new Map<string, number>();
      for (const assignment of body.assignments) {
        let truckAllocationSum = 0;
        for (const alloc of assignment.stationAllocations) {
          truckAllocationSum += alloc.allocatedLiters;
          requestTotals.set(alloc.requestId, (requestTotals.get(alloc.requestId) || 0) + alloc.allocatedLiters);
        }
        if (truckAllocationSum > assignment.litersCarried) {
          throw new DomainError(400, "invalid_allocation", `Station allocations (${truckAllocationSum}L) cannot exceed truck capacity (${assignment.litersCarried}L).`);
        }
      }

      // 3. Verify the requests exist and check requested volumes
      if (requestTotals.size > 0) {
        const requests = await tx.stationSupplyRequest.findMany({
          where: { 
            id: { in: Array.from(requestTotals.keys()) },
            tenantId: actor.tenantId
          }
        });

        if (requests.length !== requestTotals.size) {
          throw new DomainError(404, "not_found", "One or more station supply requests not found.");
        }

        for (const req of requests) {
          const allocated = requestTotals.get(req.id) || 0;
          if (allocated > Number(req.requestedLiters)) {
            throw new DomainError(400, "invalid_allocation", `Cannot allocate ${allocated}L to request ${req.id} which only asked for ${req.requestedLiters}L.`);
          }
          if (req.status !== "PENDING" && req.status !== "APPROVED") {
            throw new DomainError(400, "invalid_status", `Request ${req.id} cannot be fulfilled because its status is ${req.status}.`);
          }
        }
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

        // Generate Waybill if there are station allocations
        let waybill = null;
        if (assignment.stationAllocations.length > 0) {
          const firstAlloc = assignment.stationAllocations[0];
          const station = await tx.station.findUnique({
            where: { id: firstAlloc.stationId, tenantId: actor.tenantId },
            select: { code: true }
          });
          const rawCode = station ? station.code : "DISP";
          const prefix = rawCode.replace(/-?\d+$/, "");
          const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
          const randomNum = Math.floor(Math.random() * 900) + 100;
          const wbNumber = `WB-${prefix}-${today}-${body.productType ?? "PMS"}-${randomNum}`;

          waybill = await tx.waybill.create({
            data: {
              tenantId: actor.tenantId,
              number: wbNumber,
              productType: body.productType ?? "PMS",
              litersLoaded: assignment.litersCarried,
              truckPlate: t.truck.plateNumber || t.truck.name || "N/A",
              driverName: `${t.driver.firstName} ${t.driver.lastName}`,
              driverPhone: t.driver.phone,
              supplier: order.supplier || "Fleet Management",
              transportCompany: t.transporter.name,
              recordedById: actor.userId,
              allocations: {
                create: assignment.stationAllocations.map(alloc => ({
                  tenantId: actor.tenantId,
                  stationId: alloc.stationId,
                  litersToDispense: alloc.allocatedLiters,
                  costPerLiter: 0,
                  transportationCost: assignment.ratePerLiter * alloc.allocatedLiters,
                }))
              }
            },
            include: { allocations: true }
          });
        }

        // 5. Update the station requests for this truck
        for (const alloc of assignment.stationAllocations) {
          const waybillAlloc = waybill?.allocations.find(a => a.stationId === alloc.stationId);
          await tx.stationSupplyRequest.update({
            where: { id: alloc.requestId },
            data: {
              transportId: t.id,
              waybillAllocationId: waybillAlloc?.id,
              allocatedLiters: alloc.allocatedLiters,
              status: "IN_TRANSIT"
            }
          });
        }

        results.push(t);

        await audit({
          actorType: "TENANT_USER",
          actorId: actor.userId,
          action: "transport.create_with_fulfillment",
          tenantId: actor.tenantId,
          targetType: "Transport",
          targetId: t.id,
          after: {
            destination: t.destination,
            litersCarried: t.litersCarried,
            fulfilledRequests: assignment.stationAllocations.length
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
