import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { getAvailableVolume, recomputeTransportLoss } from "@/lib/fleet/transport-volume";

const UpdateSaleSchema = z.object({
  litersReceived: z.number().min(0).optional().nullable(),
  amountPerLiter: z.number().positive().optional(),
  litersDespatched: z.number().positive().optional(),
  stationId: z.string().optional().nullable(),
  status: z.enum(["UNPAID", "PART_PAID", "CLEARED"]).optional(),
  transportRate: z.number().min(0).optional(),
  transportCost: z.number().min(0).optional(),
  litersReturned: z.number().min(0).optional(),
  shortageDeducted: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SALES_READ.key, "FLEET");

    const Delivery = await prisma.delivery.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        customer: true,
        station: true,
        transport: {
          include: {
            transporter: { select: { id: true, name: true } },
            truck: { select: { id: true, name: true } },
          },
        },
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!Delivery) throw new DomainError(404, "not_found", "Delivery not found.");
    return ok({ Delivery });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SALES_WRITE.key, "FLEET");
    const body = UpdateSaleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.delivery.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Delivery not found.");

    const isAlreadyReceived = existing.litersReceived !== null;
    const isDispatchVolumeChanged =
      body.litersDespatched !== undefined && body.litersDespatched !== Number(existing.litersDespatched);
    const isStationChanged =
      body.stationId !== undefined && body.stationId !== existing.stationId;

    if (isAlreadyReceived && (isDispatchVolumeChanged || isStationChanged)) {
      throw new DomainError(
        400,
        "invalid_action",
        "Dispatch volume and Station cannot be modified after the delivery has been received."
      );
    }

    let newOrganizationId = existing.organizationId;
    if (body.stationId) {
      const station = await prisma.station.findFirst({
        where: { id: body.stationId, tenantId: actor.tenantId },
        select: { id: true, name: true, organizationId: true },
      });
      if (!station) throw new DomainError(404, "not_found", "Station not found.");
      newOrganizationId = station.organizationId ?? null;
    }

    if (existing.transportId) {
      const parentTransport = await prisma.transport.findUnique({
        where: { id: existing.transportId },
        select: { status: true },
      });
      if (
        body.litersReturned !== undefined &&
        body.litersReturned !== Number(existing.litersReturned) &&
        (parentTransport?.status === "COMPLETED" || parentTransport?.status === "CANCELLED")
      ) {
        throw new DomainError(400, "invalid_state", "Cannot return volume on a completed or cancelled transport.");
      }
    }

    // Returned volume only makes sense for a received delivery and cannot exceed the shortfall.
    const checkReceived =
      body.litersReceived !== undefined
        ? body.litersReceived
        : existing.litersReceived !== null
          ? Number(existing.litersReceived)
          : null;
    const checkReturned = body.litersReturned ?? Number(existing.litersReturned);
    if (checkReturned > 0) {
      if (checkReceived === null) {
        throw new DomainError(400, "invalid_action", "Confirm the received volume before returning volume to the truck.");
      }
      if (checkReceived + checkReturned > Number(existing.litersDespatched) + 0.001) {
        throw new DomainError(
          400,
          "invalid_volume",
          `Received + returned cannot exceed the ${Number(existing.litersDespatched).toLocaleString()} L despatched.`
        );
      }
    }

    if (isDispatchVolumeChanged && existing.transportId) {
      const available = await getAvailableVolume(prisma, existing.transportId, existing.id);
      if (body.litersDespatched! - Number(existing.litersReturned) > available) {
        throw new DomainError(
          400,
          "invalid_volume",
          `Dispatch volume exceeds transport's available quantity (${available.toLocaleString()} L)`
        );
      }
    }

    const newLitersDespatched = body.litersDespatched ?? Number(existing.litersDespatched);
    const newAmountPerLiter = body.amountPerLiter ?? Number(existing.amountPerLiter);
    const newLitersReceived =
      body.litersReceived !== undefined
        ? body.litersReceived
        : existing.litersReceived !== null
          ? Number(existing.litersReceived)
          : null;

    const effectiveVolume = newLitersReceived !== null ? newLitersReceived : newLitersDespatched;
    const totalExpectedAmount = effectiveVolume * newAmountPerLiter;

    let calculatedTransportCost = body.transportCost;
    if (calculatedTransportCost === undefined) {
      if (body.litersDespatched !== undefined && existing.transportRate) {
        calculatedTransportCost = Number(existing.transportRate) * newLitersDespatched;
      }
    }

    const Delivery = await prisma.delivery.update({
      where: { id },
      data: {
        ...(body.litersReceived !== undefined && { litersReceived: body.litersReceived }),
        ...(body.amountPerLiter !== undefined && { amountPerLiter: body.amountPerLiter }),
        ...(body.litersDespatched !== undefined && { litersDespatched: body.litersDespatched }),
        ...(body.litersReturned !== undefined && { litersReturned: body.litersReturned }),
        ...(body.shortageDeducted !== undefined && { shortageDeducted: body.shortageDeducted }),
        ...(body.stationId !== undefined && {
          stationId: body.stationId,
          organizationId: newOrganizationId,
          ...(body.stationId ? { customerId: null } : {}),
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.transportRate !== undefined && { transportRate: body.transportRate }),
        ...(calculatedTransportCost !== undefined && { transportCost: calculatedTransportCost }),
        totalExpectedAmount,
      },
    });

    // Cross-model reconciliation: recompute derived loss for open transports only.
    if (Delivery.transportId) {
      await recomputeTransportLoss(prisma, Delivery.transportId);
    }

    // Sync with WaybillAllocation if it's a station delivery
    if (Delivery.stationId || existing.stationId) {
      const activeAllocation = await prisma.waybillAllocation.findFirst({
        where: {
          tenantId: actor.tenantId,
          deliveryId: Delivery.id,
        },
        orderBy: { createdAt: "desc" },
      });

      if (activeAllocation) {
        const allocUpdateData: Record<string, any> = {};
        if (body.stationId !== undefined && body.stationId) {
          allocUpdateData.stationId = body.stationId;
        }
        if (body.litersDespatched !== undefined) {
          allocUpdateData.litersToDispense = body.litersDespatched;
        }
        if (body.amountPerLiter !== undefined) {
          allocUpdateData.costPerLiter = body.amountPerLiter;
        }
        if (calculatedTransportCost !== undefined) {
          allocUpdateData.transportationCost = calculatedTransportCost;
        }

        if (Object.keys(allocUpdateData).length > 0) {
          await prisma.waybillAllocation.update({
            where: { id: activeAllocation.id },
            data: allocUpdateData,
          });
        }

        if (body.litersDespatched !== undefined && activeAllocation.waybillId) {
          await prisma.waybill.update({
            where: { id: activeAllocation.waybillId },
            data: { litersLoaded: body.litersDespatched },
          });
        }
      }
    }

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "Delivery.update",
      tenantId: actor.tenantId,
      targetType: "Delivery",
      targetId: Delivery.id,
      before: {
        litersReceived: existing.litersReceived?.toString(),
        litersDespatched: existing.litersDespatched?.toString(),
        stationId: existing.stationId,
      } as object,
      after: {
        litersReceived: Delivery.litersReceived?.toString(),
        litersDespatched: Delivery.litersDespatched?.toString(),
        stationId: Delivery.stationId,
        totalExpected: Delivery.totalExpectedAmount.toString(),
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ Delivery });
  } catch (e) {
    return handleError(e);
  }
}
