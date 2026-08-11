import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateDippingSchema = z.object({
  tankId: z.string().min(1),
  dippingLiters: z.coerce.number().nonnegative(),
  dippingType: z.enum(["OPENING", "CLOSING"]).optional(),
  reason: z.string().min(1),
  pricePerLiter: z.coerce.number().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
    const body = CreateDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Resolve dippingType and reason for backward compatibility
    let resolvedDippingType = body.dippingType;
    let resolvedReason = body.reason;

    if (!resolvedDippingType) {
      if (body.reason === "OPENING_DIP") {
        resolvedDippingType = "OPENING";
        resolvedReason = "ROUTINE";
      } else if (body.reason === "CLOSING_DIP") {
        resolvedDippingType = "CLOSING";
        resolvedReason = "ROUTINE";
      }
    }

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify tank ownership and connection to station
    const tank = await prisma.tank.findUnique({
      where: { id: body.tankId },
    });
    if (!tank || tank.stationId !== stationId || tank.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Tank not found.");
    }

    // Validate that no active/ongoing shifts are running on nozzles connected to this tank
    const activeShifts = await prisma.shiftLog.findMany({
      where: {
        closingMeter: null,
        nozzle: {
          pump: {
            tankId: body.tankId,
          },
        },
      },
      include: {
        nozzle: {
          include: {
            pump: true,
          },
        },
        attendant: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (activeShifts.length > 0) {
      const activeDetails = activeShifts
        .map(
          (s) =>
            `${s.nozzle.pump.name} - ${s.nozzle.name} (${s.attendant.firstName ?? ""} ${s.attendant.lastName ?? ""})`
        )
        .join(", ");
      throw new DomainError(
        400,
        "active_shifts_running",
        `Cannot record dipping: Active shifts must be closed first on nozzles connected to this tank: ${activeDetails}.`
      );
    }

    // Validate opening and closing window rules for today
    if (resolvedDippingType) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const latestDipToday = await prisma.tankDipping.findFirst({
        where: {
          tankId: body.tankId,
          recordedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { recordedAt: "desc" },
      });

      if (resolvedDippingType === "OPENING") {
        // If latest dip is OPENING (or old OPENING_DIP), another opening is not allowed until closed
        const isCurrentlyOpen = latestDipToday && (
          latestDipToday.dippingType === "OPENING" || 
          latestDipToday.reason === "OPENING_DIP"
        );
        if (isCurrentlyOpen) {
          throw new DomainError(
            400,
            "unclosed_opening_exists",
            "An unclosed Opening dip already exists for this tank today. Please record a Closing dip first."
          );
        }
      } else if (resolvedDippingType === "CLOSING") {
        // Closing dip requires an open dip to exist today
        const isCurrentlyOpen = latestDipToday && (
          latestDipToday.dippingType === "OPENING" || 
          latestDipToday.reason === "OPENING_DIP"
        );
        if (!isCurrentlyOpen) {
          throw new DomainError(
            400,
            "missing_opening_dip",
            "No active Opening dip found for this tank today. Record an Opening dip first before recording a Closing dip."
          );
        }
      }
    }

    // Execute actions
    const result = await prisma.$transaction(async (tx) => {
      // Validate capacity inside transaction to prevent race conditions
      const latestTank = await tx.tank.findUnique({
        where: { id: body.tankId },
      });
      if (!latestTank) {
         throw new DomainError(404, "not_found", "Tank not found.");
      }
      
      const newLevel = body.dippingLiters;
      if (newLevel > Number(latestTank.capacity)) {
        throw new DomainError(400, "capacity_exceeded", `Dipping volume (${body.dippingLiters} L) would push tank "${latestTank.name}" to ${newLevel.toLocaleString()} L, exceeding capacity of ${Number(latestTank.capacity).toLocaleString()} L.`);
      }

      // If pricePerLiter is provided, create a new PriceControl entry
      if (body.pricePerLiter !== undefined) {
        await tx.priceControl.create({
          data: {
            tenantId: actor.tenantId,
            stationId,
            productType: tank.productType,
            pricePerLiter: body.pricePerLiter,
            effectiveFrom: new Date(),
          },
        });
      }

      // Create TankDipping record
      const dipping = await tx.tankDipping.create({
        data: {
          tenantId: actor.tenantId,
          tankId: body.tankId,
          dippingType: resolvedDippingType ?? null,
          dippingLiters: body.dippingLiters,
          reason: resolvedReason,
          recordedAt: new Date(),
        },
      });

      // Update tank currentLiters atomically to match the physical dip
      await tx.tank.update({
        where: { id: body.tankId },
        data: { currentLiters: body.dippingLiters },
      });

      return dipping;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tank_dipping.record",
      tenantId: actor.tenantId,
      targetType: "TankDipping",
      targetId: result.id,
      after: {
        tankId: body.tankId,
        dippingLiters: body.dippingLiters,
        reason: body.reason,
        priceUpdated: body.pricePerLiter !== undefined,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ dipping: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_READ.key, "STATION");

    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const { page, take, skip } = parseOffsetPagination(url.searchParams);

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: { tanks: true },
    });

    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const tankIds = station.tanks.map((t) => t.id);

    if (tankIds.length === 0) {
      if (useOffset) {
        return ok([], buildOffsetPageMeta(0, page, take));
      }
      return ok({ dippings: [], waybillDippings: [] });
    }

    if (useOffset) {
      const [tankDips, waybillDips, sessions] = await Promise.all([
        prisma.tankDipping.findMany({
          where: { tankId: { in: tankIds }, tenantId: actor.tenantId },
        }),
        prisma.waybillDipping.findMany({
          where: { tankId: { in: tankIds }, tenantId: actor.tenantId },
        }),
        prisma.dippingSession.findMany({
          where: { tankId: { in: tankIds }, tenantId: actor.tenantId },
          include: { 
            closings: {
              orderBy: { recordedAt: "asc" },
            }, 
            tank: true 
          },
        })
      ]);

      const sessionDips: any[] = [];
      sessions.forEach((s) => {
        let prevLiters = Number(s.openingLiters);
        let prevPrice = Number(s.pricePerLiter);

        s.closings.forEach((c, idx) => {
          const closingLit = Number(c.closingLiters);
          const litersSold = Math.max(0, prevLiters - closingLit);
          const appliedPrice = Number(c.appliedPrice ?? prevPrice);
          const revenue = litersSold * appliedPrice;

          sessionDips.push({
            id: c.id,
            sessionId: s.id,
            tankId: s.tankId,
            dippingType: "SESSION_CLOSING",
            reason: c.reason,
            recordedAt: c.recordedAt,
            openedAt: s.openedAt,
            openingLiters: prevLiters,
            closingLiters: closingLit,
            pricePerLiter: appliedPrice,
            newPricePerLiter: c.newPricePerLiter ? Number(c.newPricePerLiter) : null,
            litersSold,
            revenue,
            closingIndex: idx + 1,
            tank: s.tank,
          });

          // Next interval's opening dip is this closing dip level, and price updates if newPricePerLiter is set
          prevLiters = closingLit;
          if (c.newPricePerLiter) {
            prevPrice = Number(c.newPricePerLiter);
          }
        });

        // If session is still OPEN (no closing or active interval ongoing)
        if (s.status === "OPEN" && s.closings.length === 0) {
          sessionDips.push({
            id: s.id,
            sessionId: s.id,
            tankId: s.tankId,
            dippingType: "SESSION_OPEN",
            reason: "OPENING_DIP",
            recordedAt: s.openedAt,
            openedAt: s.openedAt,
            openingLiters: prevLiters,
            closingLiters: null,
            pricePerLiter: prevPrice,
            newPricePerLiter: null,
            litersSold: null,
            revenue: null,
            closingIndex: 0,
            tank: s.tank,
          });
        }
      });

      const allDippings = [
        ...sessionDips,
        ...tankDips.map(d => ({
          id: d.id,
          tankId: d.tankId,
          dippingLiters: Number(d.dippingLiters),
          dippingType: d.dippingType || (d.reason === 'OPENING_DIP' ? 'OPENING' : d.reason === 'CLOSING_DIP' ? 'CLOSING' : null),
          reason: d.reason,
          recordedAt: d.recordedAt,
          type: 'routine' as const
        })),
        ...waybillDips.map(d => ({
          id: d.id,
          tankId: d.tankId,
          dippingLiters: Number(d.afterLiters ?? 0) - Number(d.beforeLiters ?? 0),
          reason: 'WAYBILL DISCHARGE',
          recordedAt: d.createdAt,
          type: 'waybill' as const
        }))
      ].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

      const totalCount = allDippings.length;
      const mappedRows = allDippings.slice(skip, skip + take).map(row => {
        const tank = station.tanks.find(t => t.id === row.tankId);
        return {
          ...row,
          tank_name: tank?.name,
          product_type: tank?.productType
        };
      });

      return ok(mappedRows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      // Fetch routine tank dippings
      const dippings = await prisma.tankDipping.findMany({
        where: {
          tankId: { in: tankIds },
          tenantId: actor.tenantId,
        },
        include: {
          tank: true,
        },
        orderBy: { recordedAt: "desc" },
      });

      // Fetch new sessions
      const sessions = await prisma.dippingSession.findMany({
        where: { tankId: { in: tankIds }, tenantId: actor.tenantId },
        include: { closings: true, tank: true },
        orderBy: { openedAt: "desc" }
      });

      const mappedSessionDips = sessions.flatMap(s => {
        const records = [];
        records.push({
          id: s.id,
          tankId: s.tankId,
          dippingLiters: Number(s.openingLiters),
          dippingType: 'OPENING',
          reason: 'OPENING_DIP',
          recordedAt: s.openedAt,
          type: 'routine',
          tank: s.tank
        });
        s.closings.forEach(c => {
          records.push({
            id: c.id,
            tankId: s.tankId,
            dippingLiters: Number(c.closingLiters),
            dippingType: 'CLOSING',
            reason: c.reason,
            recordedAt: c.recordedAt,
            type: 'routine',
            tank: s.tank
          });
        });
        return records;
      });

      const allRoutineDippings = [
        ...dippings,
        ...mappedSessionDips
      ].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  
      // Fetch waybill dippings
      const waybillDippings = await prisma.waybillDipping.findMany({
        where: {
          tankId: { in: tankIds },
          tenantId: actor.tenantId,
        },
        include: {
          tank: true,
          waybill: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Map waybillDippings to expose waybillAllocationId alongside waybillId
      const mappedWaybillDippings = waybillDippings.map((d) => ({
        ...d,
        waybillAllocationId: d.waybillAllocationId,
      }));
  
      return ok({ dippings: allRoutineDippings, waybillDippings: mappedWaybillDippings });
    }
  } catch (e) {
    return handleError(e);
  }
}
