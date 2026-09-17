import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { sendPushNotification } from "@/lib/notifications";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import type {
  TicketCategory,
  TicketOrigin,
  TicketStatus,
} from "@/lib/generated/prisma/client";

export { TICKET_INCLUDE };

const ISSUE_CATEGORIES: TicketCategory[] = [
  "EQUIPMENT_FAULT",
  "INCIDENT_REPORT",
  "CASH_DISCREPANCY",
  "OTHER",
  "INVENTORY_VARIANCE",
];

export const CATEGORY_TITLES: Record<string, string> = {
  EQUIPMENT_FAULT: "Equipment fault",
  CASH_DISCREPANCY: "Cash discrepancy",
  INCIDENT_REPORT: "Incident report",
  OTHER: "Station ticket",
  INVENTORY_VARIANCE: "Inventory variance",
};

function originStory(ticket: {
  origin: TicketOrigin;
  category: TicketCategory;
  varianceLog?: { varianceType: string; varianceVolume: unknown } | null;
}): string {
  if (ticket.origin === "SYSTEM" && ticket.varianceLog) {
    const kind =
      ticket.varianceLog.varianceType === "TANK_DIPPING" ? "tank dipping shortage" : "waybill shortage";
    return `System: ${kind} ${Number(ticket.varianceLog.varianceVolume)}L`;
  }
  if (ticket.origin === "MOBILE") return "Mobile: operator submitted ticket";
  if (ticket.origin === "ADMIN") return "Admin: recorded from dashboard";
  return "System generated";
}

export function withOriginStory<T extends {
  origin: TicketOrigin;
  category: TicketCategory;
  varianceLog?: { varianceType: string; varianceVolume: unknown } | null;
}>(ticket: T) {
  return { ...ticket, originStory: originStory(ticket) };
}

async function notifyRaiser(params: {
  tokens: string[];
  title: string;
  body: string;
  ticketId: string;
  action: string;
}) {
  if (!params.tokens.length) return;
  try {
    await sendPushNotification(params.tokens, params.title, params.body, {
      ticketId: params.ticketId,
      action: params.action,
    });
  } catch (err) {
    console.error("Failed to send ticket push notification:", err);
  }
}

async function loadTicket(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: TICKET_INCLUDE,
  });
}

export async function resolveTicket(params: {
  ticketId: string;
  tenantId: string;
  actorUserId: string;
  action: "APPROVE" | "REJECT" | "RESOLVE";
  remark: string;
}) {
  const remark = params.remark.trim();
  if (!remark) {
    throw new DomainError(400, "remark_required", "A remark is required.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: params.ticketId },
      include: {
        children: { select: { status: true } },
        raisedBy: { select: { expoPushTokens: true } },
      },
    });

    if (!ticket || ticket.tenantId !== params.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    if (ticket.status === "CLOSED") {
      throw new DomainError(400, "already_resolved", "Ticket is already closed.");
    }
    if (ticket.status === "REJECTED" && params.action !== "APPROVE") {
      throw new DomainError(400, "already_resolved", "Ticket is already rejected.");
    }

    if (params.action === "REJECT") {
      return tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "REJECTED", remark, approvedById: params.actorUserId },
        include: TICKET_INCLUDE,
      });
    }

    if (params.action === "RESOLVE") {
      const blocking = ticket.children.some((c) => c.status === "PENDING_APPROVAL" || c.status === "APPROVED");
      if (blocking) {
        throw new DomainError(
          400,
          "linked_children_open",
          "Close linked tickets before resolving this issue.",
        );
      }
      return tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "RESOLVED", remark, approvedById: params.actorUserId },
        include: TICKET_INCLUDE,
      });
    }

    // "APPROVE" for normal tickets
    return tx.ticket.update({
      where: { id: ticket.id },
      data: { status: "APPROVED", remark, approvedById: params.actorUserId },
      include: TICKET_INCLUDE,
    });
  });

  const tokens = result.raisedBy?.expoPushTokens ?? [];
  if (params.action === "REJECT") {
    await notifyRaiser({
      tokens,
      title: "Ticket rejected",
      body: `“${result.title}” was rejected: ${remark}`,
      ticketId: result.id,
      action: "ticket.rejected",
    });
  } else {
    await notifyRaiser({
      tokens,
      title: "Ticket approved",
      body: `“${result.title}” was approved.`,
      ticketId: result.id,
      action: "ticket.approved",
    });
  }

  return withOriginStory(result);
}

export async function createStationTicket(params: {
  tenantId: string;
  stationId: string;
  raisedById: string;
  origin: TicketOrigin;
  category: TicketCategory;
  title: string;
  description: string;
  evidenceUrls?: string[];
  clientId?: string;
  status?: TicketStatus;
  parentTicketId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pumpId?: string | null;
  nozzleId?: string | null;
}) {
  if (params.clientId) {
    const existing = await prisma.ticket.findUnique({ where: { id: params.clientId } });
    if (existing && existing.tenantId === params.tenantId && existing.stationId === params.stationId) {
      return withOriginStory(await loadTicket(existing.id).then((row) => {
        if (!row) throw new DomainError(404, "not_found", "Ticket not found.");
        return row;
      }));
    }
  }

  if (
    params.category === "INCIDENT_REPORT" &&
    params.origin === "MOBILE" &&
    (!params.evidenceUrls || params.evidenceUrls.length === 0)
  ) {
    throw new DomainError(400, "invalid_input", "Incident reports require at least one photo.");
  }

  if (params.pumpId) {
    const pump = await prisma.pump.findUnique({ where: { id: params.pumpId } });
    if (!pump || pump.tenantId !== params.tenantId || pump.stationId !== params.stationId) {
      throw new DomainError(404, "not_found", "Pump not found at this station.");
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      id: params.clientId || undefined,
      tenantId: params.tenantId,
      stationId: params.stationId,
      raisedById: params.raisedById,
      category: params.category,
      origin: params.origin,
      title: params.title,
      description: params.description,
      status: params.status ?? "OPEN",
      evidenceUrls: params.evidenceUrls ?? [],
      parentTicketId: params.parentTicketId ?? null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      pumpId: params.pumpId ?? null,
      nozzleId: params.nozzleId ?? null,
    },
    include: TICKET_INCLUDE,
  });

  if (params.pumpId && params.category === "EQUIPMENT_FAULT") {
    await prisma.pump.update({
      where: { id: params.pumpId },
      data: { status: "ISSUE" },
    });
  }

  return withOriginStory(ticket);
}
