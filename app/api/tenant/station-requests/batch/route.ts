import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateBatchRequestSchema = z.object({
  notes: z.string().optional().nullable(),
  requests: z.array(z.object({
    stationId: z.string().min(1, "Station is required"),
    productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
    requestedLiters: z.coerce.number().positive("Must be positive"),
  })).min(1, "At least one request is required"),
});

function generateBatchReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RB-${dateStr}-${randomStr}`;
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key);
    const body = CreateBatchRequestSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify all stations belong to tenant
    const stationIds = [...new Set(body.requests.map(r => r.stationId))];
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds }, tenantId: actor.tenantId },
      select: { id: true }
    });
    
    if (stations.length !== stationIds.length) {
      throw new DomainError(404, "not_found", "One or more stations not found.");
    }

    const batch = await prisma.$transaction(async (tx) => {
      // Create batch parent
      const batchRef = generateBatchReference();
      const newBatch = await tx.supplyRequestBatch.create({
        data: {
          tenantId: actor.tenantId,
          reference: batchRef,
          notes: body.notes ?? null,
          requestedById: actor.userId,
        }
      });

      // Create individual requests
      const requestPromises = body.requests.map(req => 
        tx.stationSupplyRequest.create({
          data: {
            tenantId: actor.tenantId,
            batchId: newBatch.id,
            stationId: req.stationId,
            productType: req.productType,
            requestedLiters: req.requestedLiters,
            status: "PENDING",
            requestedById: actor.userId,
            notes: body.notes ?? null, // Copy batch notes to individual requests for easy reading
          }
        })
      );

      const createdRequests = await Promise.all(requestPromises);

      // Log audit
      await audit({
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "station_request_batch.create",
        tenantId: actor.tenantId,
        targetType: "SupplyRequestBatch",
        targetId: newBatch.id,
        after: { 
          reference: batchRef, 
          numberOfRequests: body.requests.length,
          totalLiters: body.requests.reduce((sum, r) => sum + r.requestedLiters, 0)
        } as object,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return {
        ...newBatch,
        requests: createdRequests
      };
    });

    return ok({ batch });
  } catch (e) {
    return handleError(e);
  }
}
