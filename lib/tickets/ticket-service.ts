import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { sendPushNotification } from "@/lib/notifications";
import { applyExpenseStatus } from "@/lib/finance/expense-approval";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import type { ExpenseCategory, TicketCategory, TicketOrigin } from "@/lib/generated/prisma/client";

export { TICKET_INCLUDE };

function originStory(ticket: {
  origin: TicketOrigin;
  category: TicketCategory;
  requestedAmount?: unknown;
  varianceLog?: { varianceType: string; varianceVolume: unknown } | null;
}): string {
  if (ticket.origin === "SYSTEM" && ticket.varianceLog) {
    const kind =
      ticket.varianceLog.varianceType === "TANK_DIPPING" ? "tank dipping shortage" : "waybill shortage";
    return `System: ${kind} ${Number(ticket.varianceLog.varianceVolume)}L`;
  }
  if (ticket.category === "EXPENSE_REQUEST") {
    const amount = ticket.requestedAmount != null ? Number(ticket.requestedAmount) : 0;
    return `${ticket.origin === "MOBILE" ? "Mobile" : "Admin"}: spend request ₦${amount.toLocaleString()}`;
  }
  if (ticket.category === "EXPENSE_VERIFY") {
    return `${ticket.origin === "MOBILE" ? "Mobile" : "Admin"}: expense sent for verification`;
  }
  if (ticket.origin === "MOBILE") return "Mobile: operator submitted ticket";
  if (ticket.origin === "ADMIN") return "Admin: recorded from dashboard";
  return "System generated";
}

export function withOriginStory<T extends {
  origin: TicketOrigin;
  category: TicketCategory;
  requestedAmount?: unknown;
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

export async function resolveTicket(params: {
  ticketId: string;
  tenantId: string;
  actorUserId: string;
  action: "APPROVE" | "REJECT";
  remark: string;
}) {
  const remark = params.remark.trim();
  if (!remark) {
    throw new DomainError(400, "remark_required", "A remark is required.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: params.ticketId },
      include: { expense: true, raisedBy: { select: { expoPushTokens: true } } },
    });

    if (!ticket || ticket.tenantId !== params.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      throw new DomainError(400, "already_resolved", "Ticket is already resolved.");
    }

    if (ticket.category === "EXPENSE_VERIFY" && ticket.expenseId) {
      await applyExpenseStatus(tx, {
        expenseId: ticket.expenseId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        status: params.action === "APPROVE" ? "APPROVED" : "REJECTED",
      });
    }

    const nextStatus =
      params.action === "APPROVE"
        ? ticket.category === "EXPENSE_VERIFY"
          ? "CLOSED"
          : "RESOLVED"
        : "OPEN";

    return tx.ticket.update({
      where: { id: params.ticketId },
      data: {
        status: nextStatus,
        remark,
        approvedById: params.actorUserId,
      },
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
      body:
        result.category === "EXPENSE_REQUEST"
          ? `Spend request approved. You can now record the expense.`
          : `“${result.title}” was approved.`,
      ticketId: result.id,
      action: "ticket.approved",
    });
  }

  return withOriginStory(result);
}

export async function reviewExpense(params: {
  expenseId: string;
  tenantId: string;
  actorUserId: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  remark?: string;
  bankAccountId?: string | null;
}) {
  const linked = await prisma.ticket.findUnique({
    where: { expenseId: params.expenseId },
  });

  if (linked && linked.category === "EXPENSE_VERIFY" && params.status !== "PENDING") {
    return {
      ticket: await resolveTicket({
        ticketId: linked.id,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        action: params.status === "APPROVED" ? "APPROVE" : "REJECT",
        remark: params.remark?.trim() || `Reviewed from expenses (${params.status.toLowerCase()})`,
      }),
    };
  }

  const expense = await prisma.$transaction(async (tx) =>
    applyExpenseStatus(tx, {
      expenseId: params.expenseId,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      status: params.status,
      bankAccountId: params.bankAccountId,
    }),
  );

  return { expense };
}

export async function createStationTicket(params: {
  tenantId: string;
  stationId: string;
  raisedById: string;
  origin: TicketOrigin;
  category: TicketCategory;
  title: string;
  description: string;
  requestedAmount?: number | null;
  requestedCategory?: ExpenseCategory | null;
  evidenceUrls?: string[];
  clientId?: string;
  expenseId?: string | null;
  status?: "OPEN" | "PENDING_APPROVAL";
}) {
  if (params.clientId) {
    const existing = await prisma.ticket.findUnique({ where: { id: params.clientId } });
    if (existing && existing.tenantId === params.tenantId && existing.stationId === params.stationId) {
      return withOriginStory(await prisma.ticket.findUniqueOrThrow({
        where: { id: existing.id },
        include: TICKET_INCLUDE,
      }));
    }
  }

  if (params.category === "EXPENSE_REQUEST") {
    if (!params.requestedAmount || params.requestedAmount <= 0 || !params.requestedCategory) {
      throw new DomainError(
        400,
        "invalid_input",
        "Spend requests require an amount and expense category.",
      );
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
      status: params.status ?? (params.category === "EXPENSE_REQUEST" || params.category === "EXPENSE_VERIFY"
        ? "PENDING_APPROVAL"
        : "OPEN"),
      requestedAmount: params.requestedAmount ?? null,
      requestedCategory: params.requestedCategory ?? null,
      evidenceUrls: params.evidenceUrls ?? [],
      expenseId: params.expenseId ?? null,
    },
    include: TICKET_INCLUDE,
  });

  return withOriginStory(ticket);
}

export async function recordExpenseAgainstTicket(params: {
  tenantId: string;
  stationId: string;
  actorUserId: string;
  ticketId: string;
  expense: {
    id?: string;
    category: ExpenseCategory;
    paymentMethod: "CASH" | "POS" | "BANK_TRANSFER" | "CHEQUE";
    amount: number;
    description: string;
    receiptUrl?: string | null;
    bankAccountId?: string | null;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: params.ticketId } });
    if (!ticket || ticket.tenantId !== params.tenantId || ticket.stationId !== params.stationId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }
    if (ticket.category !== "EXPENSE_REQUEST") {
      throw new DomainError(400, "invalid_state", "This ticket is not a spend request.");
    }
    if (ticket.status !== "RESOLVED") {
      throw new DomainError(400, "invalid_state", "Spend request must be approved before recording an expense.");
    }
    if (ticket.expenseId) {
      throw new DomainError(400, "invalid_state", "An expense is already recorded for this ticket.");
    }

    const requested = ticket.requestedAmount != null ? Number(ticket.requestedAmount) : 0;
    const withinCap = requested > 0 && params.expense.amount <= requested;

    const expense = await tx.expense.create({
      data: {
        id: params.expense.id,
        tenantId: params.tenantId,
        stationId: params.stationId,
        category: params.expense.category,
        paymentMethod: params.expense.paymentMethod,
        amount: params.expense.amount,
        description: params.expense.description,
        receiptUrl: params.expense.receiptUrl,
        bankAccountId: params.expense.bankAccountId ?? null,
        recordedById: params.actorUserId,
        status: "PENDING",
      },
    });

    if (withinCap) {
      await applyExpenseStatus(tx, {
        expenseId: expense.id,
        tenantId: params.tenantId,
        actorUserId: ticket.approvedById ?? params.actorUserId,
        status: "APPROVED",
        bankAccountId: params.expense.bankAccountId,
      });
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { expenseId: expense.id, status: "CLOSED" },
      });
    } else {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          expenseId: expense.id,
          status: "PENDING_APPROVAL",
          remark: `Recorded amount ₦${params.expense.amount.toLocaleString()} exceeds approved ₦${requested.toLocaleString()}.`,
        },
      });
    }

    return expense;
  });
}
