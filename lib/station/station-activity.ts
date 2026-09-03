import { prisma } from "@/lib/db/client";
import { AuthError } from "@/lib/auth/guards";
import { DomainError } from "@/lib/api/errors";
import type { TenantActor } from "@/lib/auth/permissions";
import { failedActivityWhere } from "@/lib/activity/status";

export async function validateStationAccess(
  actor: TenantActor,
  stationId: string,
): Promise<{ id: string; name: string; code: string; organizationId: string }> {
  const station = await prisma.station.findFirst({
    where: { id: stationId, tenantId: actor.tenantId },
    select: { id: true, name: true, code: true, organizationId: true },
  });

  if (!station) {
    throw new DomainError(404, "not_found", "Station not found.");
  }

  if (actor.organizationId && actor.organizationId !== station.organizationId) {
    throw new AuthError(403, "Access denied: Station belongs to a different organization.");
  }

  // If user has specific assigned stations, verify membership
  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: {
      stations: { select: { id: true } },
    },
  });

  const assignedStationIds = user?.stations?.map((s) => s.id) || [];
  if (assignedStationIds.length > 0 && !assignedStationIds.includes(stationId)) {
    throw new AuthError(403, "Access denied: You are not assigned to this station.");
  }

  return station;
}

export async function getStationEntityIds(
  tenantId: string,
  stationIds: string[],
): Promise<{
  tankIds: string[];
  pumpIds: string[];
  salesLogIds: string[];
  expenseIds: string[];
  shiftIds: string[];
  dippingSessionIds: string[];
  tankDippingIds: string[];
  priceControlIds: string[];
  ticketIds: string[];
  waybillIds: string[];
}> {
  if (stationIds.length === 0) {
    return {
      tankIds: [],
      pumpIds: [],
      salesLogIds: [],
      expenseIds: [],
      shiftIds: [],
      dippingSessionIds: [],
      tankDippingIds: [],
      priceControlIds: [],
      ticketIds: [],
      waybillIds: [],
    };
  }

  const [
    tanks,
    pumps,
    salesLogs,
    expenses,
    shifts,
    dippingSessions,
    tankDippings,
    priceControls,
    tickets,
    waybills,
  ] = await Promise.all([
    prisma.tank.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.pump.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.salesLog.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.shiftLog.findMany({
      where: { tenantId, nozzle: { pump: { stationId: { in: stationIds } } } },
      select: { id: true },
    }),
    prisma.dippingSession.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.tankDipping.findMany({
      where: { tenantId, tank: { stationId: { in: stationIds } } },
      select: { id: true },
    }),
    prisma.priceControl.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.ticket.findMany({
      where: { tenantId, stationId: { in: stationIds } },
      select: { id: true },
    }),
    prisma.waybill.findMany({
      where: { tenantId, allocations: { some: { stationId: { in: stationIds } } } },
      select: { id: true },
    }),
  ]);

  return {
    tankIds: tanks.map((t) => t.id),
    pumpIds: pumps.map((p) => p.id),
    salesLogIds: salesLogs.map((s) => s.id),
    expenseIds: expenses.map((e) => e.id),
    shiftIds: shifts.map((s) => s.id),
    dippingSessionIds: dippingSessions.map((d) => d.id),
    tankDippingIds: tankDippings.map((td) => td.id),
    priceControlIds: priceControls.map((pc) => pc.id),
    ticketIds: tickets.map((t) => t.id),
    waybillIds: waybills.map((w) => w.id),
  };
}

export async function buildStationActivityWhere({
  actor,
  stationIds,
  action,
  date,
  from,
  to,
  userId,
  status,
}: {
  actor: TenantActor;
  stationIds: string[];
  action?: string | null;
  date?: string | null;
  from?: string | null;
  to?: string | null;
  userId?: string | null;
  status?: "SUCCESS" | "FAILED" | "" | null;
}): Promise<Record<string, unknown>> {
  const entityIds = await getStationEntityIds(actor.tenantId, stationIds);

  // Only match activity logs that directly target one of these stations
  const targetConditions: Record<string, unknown>[] = [
    { targetType: "Station", targetId: { in: stationIds } },
  ];

  // Scope JSON path matches to station-relevant entity types only,
  // so fleet entities (Order, Transport, etc.) don't leak through.
  const stationScopedTargetTypes = [
    "Station", "Tank", "Pump", "SalesLog", "Expense", "ShiftLog",
    "DippingSession", "TankDipping", "PriceControl", "Ticket", "Nozzle",
  ];
  for (const sId of stationIds) {
    targetConditions.push({
      targetType: { in: stationScopedTargetTypes },
      afterJson: { path: ["stationId"], equals: sId },
    });
    targetConditions.push({
      targetType: { in: stationScopedTargetTypes },
      beforeJson: { path: ["stationId"], equals: sId },
    });
  }

  if (entityIds.tankIds.length > 0) {
    targetConditions.push({ targetType: "Tank", targetId: { in: entityIds.tankIds } });
  }
  if (entityIds.pumpIds.length > 0) {
    targetConditions.push({ targetType: "Pump", targetId: { in: entityIds.pumpIds } });
  }
  if (entityIds.salesLogIds.length > 0) {
    targetConditions.push({ targetType: "SalesLog", targetId: { in: entityIds.salesLogIds } });
  }
  if (entityIds.expenseIds.length > 0) {
    targetConditions.push({ targetType: "Expense", targetId: { in: entityIds.expenseIds } });
  }
  if (entityIds.shiftIds.length > 0) {
    targetConditions.push({ targetType: "ShiftLog", targetId: { in: entityIds.shiftIds } });
  }
  if (entityIds.dippingSessionIds.length > 0) {
    targetConditions.push({
      targetType: "DippingSession",
      targetId: { in: entityIds.dippingSessionIds },
    });
  }
  if (entityIds.tankDippingIds.length > 0) {
    targetConditions.push({
      targetType: "TankDipping",
      targetId: { in: entityIds.tankDippingIds },
    });
  }
  if (entityIds.priceControlIds.length > 0) {
    targetConditions.push({
      targetType: "PriceControl",
      targetId: { in: entityIds.priceControlIds },
    });
  }
  if (entityIds.ticketIds.length > 0) {
    targetConditions.push({ targetType: "Ticket", targetId: { in: entityIds.ticketIds } });
  }
  if (entityIds.waybillIds.length > 0) {
    targetConditions.push({ targetType: "Waybill", targetId: { in: entityIds.waybillIds } });
  }

  const andConditions: Record<string, unknown>[] = [
    { tenantId: actor.tenantId },
    { module: "STATION" },
    { OR: targetConditions },
  ];

  if (action && action.trim()) {
    andConditions.push({ action: { contains: action.trim(), mode: "insensitive" } });
  }

  if (from || to) {
    andConditions.push({
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    });
  } else if (date) {
    const dayStr = date.split("T")[0];
    andConditions.push({
      createdAt: {
        gte: new Date(`${dayStr}T00:00:00.000Z`),
        lte: new Date(`${dayStr}T23:59:59.999Z`),
      },
    });
  }

  if (userId) {
    andConditions.push({
      OR: [
        { actorId: userId },
        { targetType: "TenantUser", targetId: userId },
      ],
    });
  }

  if (status === "FAILED") {
    return {
      AND: [...andConditions, failedActivityWhere()],
    };
  } else if (status === "SUCCESS") {
    return {
      AND: [...andConditions],
      NOT: failedActivityWhere(),
    };
  }

  return { AND: andConditions };
}
