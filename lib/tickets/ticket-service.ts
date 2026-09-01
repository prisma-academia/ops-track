import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { sendPushNotification } from "@/lib/notifications";
import { applyExpenseStatus } from "@/lib/finance/expense-approval";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";
import type {
  ExpenseCategory,
  PaymentMethod,
  SpendIntent,
  TicketCategory,
  TicketOrigin,
  TicketStatus,
} from "@/lib/generated/prisma/client";

export { TICKET_INCLUDE };

const SPEND_CATEGORIES: TicketCategory[] = ["EXPENSE_REQUEST", "EXPENSE_VERIFY"];
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
  EXPENSE_REQUEST: "Spend request",
  EXPENSE_VERIFY: "Expense verification",
  INCIDENT_REPORT: "Incident report",
  OTHER: "Station ticket",
  INVENTORY_VARIANCE: "Inventory variance",
};

function originStory(ticket: {
  origin: TicketOrigin;
  category: TicketCategory;
  spendIntent?: SpendIntent | null;
  requestedAmount?: unknown;
  varianceLog?: { varianceType: string; varianceVolume: unknown } | null;
}): string {
  if (ticket.origin === "SYSTEM" && ticket.varianceLog) {
    const kind =
      ticket.varianceLog.varianceType === "TANK_DIPPING" ? "tank dipping shortage" : "waybill shortage";
    return `System: ${kind} ${Number(ticket.varianceLog.varianceVolume)}L`;
  }
  if (ticket.category === "EXPENSE_REQUEST" || ticket.spendIntent === "REQUEST") {
    const amount = ticket.requestedAmount != null ? Number(ticket.requestedAmount) : 0;
    return `${ticket.origin === "MOBILE" ? "Mobile" : "Admin"}: spend request ₦${amount.toLocaleString()}`;
  }
  if (ticket.category === "EXPENSE_VERIFY" || ticket.spendIntent === "ALREADY_PAID") {
    return `${ticket.origin === "MOBILE" ? "Mobile" : "Admin"}: expense sent for verification`;
  }
  if (ticket.origin === "MOBILE") return "Mobile: operator submitted ticket";
  if (ticket.origin === "ADMIN") return "Admin: recorded from dashboard";
  return "System generated";
}

export function withOriginStory<T extends {
  origin: TicketOrigin;
  category: TicketCategory;
  spendIntent?: SpendIntent | null;
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

function isSpendTicket(category: TicketCategory, spendIntent?: SpendIntent | null) {
  return SPEND_CATEGORIES.includes(category) || spendIntent === "REQUEST" || spendIntent === "ALREADY_PAID";
}

function defaultSpendIntent(category: TicketCategory, explicit?: SpendIntent | null): SpendIntent {
  if (explicit && explicit !== "NONE") return explicit;
  if (category === "EXPENSE_REQUEST") return "REQUEST";
  if (category === "EXPENSE_VERIFY") return "ALREADY_PAID";
  return "NONE";
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
  approvedAmount?: number | null;
}) {
  const remark = params.remark.trim();
  if (!remark) {
    throw new DomainError(400, "remark_required", "A remark is required.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: params.ticketId },
      include: {
        expense: true,
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

    const spend = isSpendTicket(ticket.category, ticket.spendIntent);

    if (params.action === "REJECT") {
      if (ticket.expenseId) {
        await applyExpenseStatus(tx, {
          expenseId: ticket.expenseId,
          tenantId: params.tenantId,
          actorUserId: params.actorUserId,
          status: "REJECTED",
        });
      }
      return tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "REJECTED", remark, approvedById: params.actorUserId },
        include: TICKET_INCLUDE,
      });
    }

    if (params.action === "RESOLVE") {
      if (spend) {
        throw new DomainError(400, "invalid_state", "Spend tickets must be approved and paid out, not resolved.");
      }
      const blocking = ticket.children.some((c) => c.status === "PENDING_APPROVAL" || c.status === "APPROVED");
      if (blocking) {
        throw new DomainError(
          400,
          "linked_spend_open",
          "Close or pay linked spend tickets before resolving this issue.",
        );
      }
      return tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "RESOLVED", remark, approvedById: params.actorUserId },
        include: TICKET_INCLUDE,
      });
    }

    if (spend) {
      if (ticket.status !== "PENDING_APPROVAL" && ticket.status !== "OPEN") {
        throw new DomainError(400, "invalid_state", "Only pending spend can be approved.");
      }
      const requested = ticket.requestedAmount != null ? Number(ticket.requestedAmount) : 0;
      const approvedAmount = params.approvedAmount != null && params.approvedAmount > 0
        ? params.approvedAmount
        : requested;
      if (approvedAmount <= 0) {
        throw new DomainError(400, "invalid_input", "Approved amount must be greater than zero.");
      }

      if (params.approvedAmount != null && params.approvedAmount !== requested) {
        await tx.ticketSpendRevision.create({
          data: {
            tenantId: ticket.tenantId,
            ticketId: ticket.id,
            actorId: params.actorUserId,
            previousApproved: ticket.approvedAmount,
            newRequested: requested,
            newApproved: approvedAmount,
            reason: remark,
          },
        });
      }

      return tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "APPROVED",
          approvedAmount,
          remark,
          approvedById: params.actorUserId,
        },
        include: TICKET_INCLUDE,
      });
    }

    return tx.ticket.update({
      where: { id: ticket.id },
      data: { status: "RESOLVED", remark, approvedById: params.actorUserId },
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
  } else if (isSpendTicket(result.category, result.spendIntent)) {
    await notifyRaiser({
      tokens,
      title: "Spend approved",
      body: `Spend request approved. Waiting for payout.`,
      ticketId: result.id,
      action: "ticket.approved",
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

export async function payoutTicket(params: {
  ticketId: string;
  tenantId: string;
  actorUserId: string;
  paymentMethod: Extract<PaymentMethod, "CASH" | "POS" | "BANK_TRANSFER" | "CHEQUE">;
  bankAccountId?: string | null;
  amount?: number | null;
  receiptUrl?: string | null;
  description?: string | null;
}) {
  if (params.paymentMethod !== "CASH" && !params.bankAccountId) {
    throw new DomainError(400, "invalid_input", "Bank account is required for non-cash outflows.");
  }

  const ticketForStation = await prisma.ticket.findUnique({
    where: { id: params.ticketId },
    select: { stationId: true, tenantId: true },
  });
  if (ticketForStation?.tenantId === params.tenantId) {
    await assertOptionalBankAccount({
      accountId: params.bankAccountId,
      tenantId: params.tenantId,
      context: "STATION",
      stationId: ticketForStation.stationId,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: params.ticketId },
      include: { expense: true },
    });

    if (!ticket || ticket.tenantId !== params.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }
    if (!isSpendTicket(ticket.category, ticket.spendIntent)) {
      throw new DomainError(400, "invalid_state", "Only spend tickets can be paid out.");
    }
    const legacyApproved =
      ticket.status === "RESOLVED" && isSpendTicket(ticket.category, ticket.spendIntent) && !ticket.expenseId;
    if (ticket.status !== "APPROVED" && !legacyApproved) {
      throw new DomainError(400, "invalid_state", "Approve the spend cap before paying out.");
    }
    if (ticket.expenseId && ticket.expense?.status === "APPROVED") {
      throw new DomainError(400, "already_paid", "This expense already has an outflow.");
    }

    const cap = ticket.approvedAmount != null ? Number(ticket.approvedAmount) : Number(ticket.requestedAmount ?? 0);
    const payAmount = params.amount != null && params.amount > 0 ? params.amount : cap;
    if (payAmount <= 0) {
      throw new DomainError(400, "invalid_input", "Payout amount must be greater than zero.");
    }
    if (payAmount > cap) {
      throw new DomainError(
        400,
        "over_cap",
        `Payout ₦${payAmount.toLocaleString()} exceeds approved ₦${cap.toLocaleString()}. Request an increase first.`,
      );
    }

    const category = ticket.requestedCategory ?? ticket.expense?.category;
    if (!category) {
      throw new DomainError(400, "invalid_state", "Spend ticket is missing an expense category.");
    }

    let expenseId = ticket.expenseId;
    if (!expenseId) {
      const expense = await tx.expense.create({
        data: {
          tenantId: ticket.tenantId,
          stationId: ticket.stationId,
          category,
          paymentMethod: params.paymentMethod,
          amount: payAmount,
          description: params.description?.trim() || ticket.description,
          receiptUrl: params.receiptUrl ?? null,
          bankAccountId: params.bankAccountId ?? null,
          recordedById: params.actorUserId,
          status: "PENDING",
        },
      });
      expenseId = expense.id;
    } else {
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          paymentMethod: params.paymentMethod,
          amount: payAmount,
          bankAccountId: params.bankAccountId ?? null,
          receiptUrl: params.receiptUrl ?? ticket.expense?.receiptUrl ?? null,
          description: params.description?.trim() || ticket.expense?.description || ticket.description,
        },
      });
    }

    await applyExpenseStatus(tx, {
      expenseId,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      status: "APPROVED",
      bankAccountId: params.bankAccountId ?? null,
    });

    return tx.ticket.update({
      where: { id: ticket.id },
      data: {
        expenseId,
        paidAmount: payAmount,
        status: "CLOSED",
        approvedById: params.actorUserId,
      },
      include: TICKET_INCLUDE,
    });
  });

  const tokens = result.raisedBy?.expoPushTokens ?? [];
  await notifyRaiser({
    tokens,
    title: "Expense paid",
    body: `₦${Number(result.paidAmount ?? 0).toLocaleString()} was paid out for “${result.title}”.`,
    ticketId: result.id,
    action: "ticket.paid",
  });

  return withOriginStory(result);
}

export async function requestTicketIncrease(params: {
  ticketId: string;
  tenantId: string;
  actorUserId: string;
  newRequestedAmount: number;
  reason: string;
}) {
  const reason = params.reason.trim();
  if (!reason) {
    throw new DomainError(400, "remark_required", "A reason is required.");
  }
  if (!params.newRequestedAmount || params.newRequestedAmount <= 0) {
    throw new DomainError(400, "invalid_input", "New amount must be greater than zero.");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: params.ticketId } });
  if (!ticket || ticket.tenantId !== params.tenantId) {
    throw new DomainError(404, "not_found", "Ticket not found.");
  }
  if (!isSpendTicket(ticket.category, ticket.spendIntent)) {
    throw new DomainError(400, "invalid_state", "Only spend tickets can request an increase.");
  }
  if (ticket.status === "CLOSED" || ticket.status === "REJECTED") {
    throw new DomainError(400, "invalid_state", "Closed or rejected tickets cannot be increased. Attach new spend instead.");
  }
  if (ticket.status !== "APPROVED" && ticket.status !== "PENDING_APPROVAL") {
    throw new DomainError(400, "invalid_state", "Increase is only allowed before payout.");
  }

  const current = ticket.requestedAmount != null ? Number(ticket.requestedAmount) : 0;
  const approved = ticket.approvedAmount != null ? Number(ticket.approvedAmount) : 0;
  if (params.newRequestedAmount <= Math.max(current, approved)) {
    throw new DomainError(400, "invalid_input", "New amount must be higher than the current requested or approved amount.");
  }

  await prisma.ticketSpendRevision.create({
    data: {
      tenantId: ticket.tenantId,
      ticketId: ticket.id,
      actorId: params.actorUserId,
      previousApproved: ticket.approvedAmount,
      newRequested: params.newRequestedAmount,
      newApproved: null,
      reason,
    },
  });

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      requestedAmount: params.newRequestedAmount,
      status: "PENDING_APPROVAL",
      remark: reason,
    },
    include: TICKET_INCLUDE,
  });

  return withOriginStory(updated);
}

export async function attachSpendToTicket(params: {
  parentTicketId: string;
  tenantId: string;
  raisedById: string;
  origin: TicketOrigin;
  spendIntent: "REQUEST" | "ALREADY_PAID";
  requestedAmount: number;
  requestedCategory: ExpenseCategory;
  description: string;
  evidenceUrls?: string[];
  clientId?: string;
  alreadyPaid?: {
    paymentMethod: Extract<PaymentMethod, "CASH" | "POS" | "BANK_TRANSFER" | "CHEQUE">;
    receiptUrl?: string | null;
    bankAccountId?: string | null;
  };
}) {
  const parent = await prisma.ticket.findUnique({ where: { id: params.parentTicketId } });
  if (!parent || parent.tenantId !== params.tenantId) {
    throw new DomainError(404, "not_found", "Parent ticket not found.");
  }
  if (!ISSUE_CATEGORIES.includes(parent.category)) {
    throw new DomainError(400, "invalid_state", "Spend can only be attached to an issue or incident ticket.");
  }
  if (parent.status === "CLOSED" || parent.status === "REJECTED") {
    throw new DomainError(400, "invalid_state", "Cannot attach spend to a closed or rejected ticket.");
  }

  return createStationTicket({
    tenantId: params.tenantId,
    stationId: parent.stationId,
    raisedById: params.raisedById,
    origin: params.origin,
    category: params.spendIntent === "ALREADY_PAID" ? "EXPENSE_VERIFY" : "EXPENSE_REQUEST",
    title: params.spendIntent === "ALREADY_PAID" ? "Linked expense verification" : "Linked spend request",
    description: params.description,
    requestedAmount: params.requestedAmount,
    requestedCategory: params.requestedCategory,
    spendIntent: params.spendIntent,
    parentTicketId: parent.id,
    evidenceUrls: params.evidenceUrls,
    clientId: params.clientId,
    alreadyPaid: params.alreadyPaid,
  });
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

  if (linked && params.status === "REJECTED") {
    return {
      ticket: await resolveTicket({
        ticketId: linked.id,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        action: "REJECT",
        remark: params.remark?.trim() || "Reviewed from expenses (rejected)",
      }),
    };
  }

  if (linked && params.status === "APPROVED") {
    throw new DomainError(
      400,
      "use_payout",
      "Approve the ticket, then pay out from the ticket to post the outflow.",
    );
  }

  if (params.bankAccountId) {
    const expenseRow = await prisma.expense.findFirst({
      where: { id: params.expenseId, tenantId: params.tenantId },
      select: { stationId: true, context: true },
    });
    await assertOptionalBankAccount({
      accountId: params.bankAccountId,
      tenantId: params.tenantId,
      context: expenseRow?.context === "FLEET" ? "FLEET" : "STATION",
      stationId: expenseRow?.stationId,
    });
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
  spendIntent?: SpendIntent | null;
  evidenceUrls?: string[];
  clientId?: string;
  expenseId?: string | null;
  status?: TicketStatus;
  parentTicketId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pumpId?: string | null;
  nozzleId?: string | null;
  alreadyPaid?: {
    paymentMethod: Extract<PaymentMethod, "CASH" | "POS" | "BANK_TRANSFER" | "CHEQUE">;
    receiptUrl?: string | null;
    bankAccountId?: string | null;
  } | null;
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

  const spendIntent = defaultSpendIntent(params.category, params.spendIntent);
  const isSpend = spendIntent !== "NONE" || SPEND_CATEGORIES.includes(params.category);

  if (isSpend) {
    if (!params.requestedAmount || params.requestedAmount <= 0 || !params.requestedCategory) {
      throw new DomainError(
        400,
        "invalid_input",
        "Spend tickets require an amount and expense category.",
      );
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

  let expenseId = params.expenseId ?? null;
  if (spendIntent === "ALREADY_PAID" && !expenseId) {
    if (!params.alreadyPaid?.paymentMethod) {
      throw new DomainError(400, "invalid_input", "Already-paid spend requires a payment method.");
    }
    if (params.alreadyPaid.paymentMethod !== "CASH" && !params.alreadyPaid.bankAccountId) {
      throw new DomainError(400, "invalid_input", "Bank account is required for non-cash payments.");
    }
    const expense = await prisma.expense.create({
      data: {
        tenantId: params.tenantId,
        stationId: params.stationId,
        category: params.requestedCategory!,
        paymentMethod: params.alreadyPaid.paymentMethod,
        amount: params.requestedAmount!,
        description: params.description,
        receiptUrl: params.alreadyPaid.receiptUrl ?? null,
        bankAccountId: params.alreadyPaid.bankAccountId ?? null,
        recordedById: params.raisedById,
        status: "PENDING",
      },
    });
    expenseId = expense.id;
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
      status:
        params.status ??
        (isSpend ? "PENDING_APPROVAL" : "OPEN"),
      requestedAmount: params.requestedAmount ?? null,
      requestedCategory: params.requestedCategory ?? null,
      spendIntent,
      evidenceUrls: params.evidenceUrls ?? [],
      expenseId,
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
  throw new DomainError(
    400,
    "use_payout",
    "Station payouts are recorded by admin from the ticket Pay out action.",
  );
}
