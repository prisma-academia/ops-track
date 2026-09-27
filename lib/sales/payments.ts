import { DomainError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/client";
import type { Prisma, SalesLogStatus, SalesPaymentMethod } from "@/lib/generated/prisma/client";

export type PaymentInput = {
  id?: string;
  clientId?: string | null;
  method: "POS" | "TRANSFER";
  amount: number;
  bankAccountId: string;
  receiptUrl?: string | null;
};

export const salesPaymentInclude = {
  bankAccount: {
    select: { id: true, accountName: true, accountNumber: true, bankName: true, scope: true },
  },
  reviews: {
    orderBy: { reviewedAt: "asc" as const },
    include: {
      reviewedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  },
};

export function sumsFromPayments(payments: { method: SalesPaymentMethod | string; amount: number }[]) {
  let amountPos = 0;
  let amountTransfer = 0;
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.method === "POS") amountPos += amt;
    else amountTransfer += amt;
  }
  return { amountPos, amountTransfer };
}

export function firstBankIds(payments: PaymentInput[]) {
  const pos = payments.find((p) => p.method === "POS" && p.amount > 0);
  const transfer = payments.find((p) => p.method === "TRANSFER" && p.amount > 0);
  return {
    posBankAccountId: pos?.bankAccountId ?? null,
    transferBankAccountId: transfer?.bankAccountId ?? null,
    posReceiptUrl: payments.find((p) => p.method === "POS" && p.receiptUrl)?.receiptUrl ?? null,
    transferReceiptUrl: payments.find((p) => p.method === "TRANSFER" && p.receiptUrl)?.receiptUrl ?? null,
  };
}

export function rollupSalesLogStatus(
  payments: { status: SalesLogStatus | string }[],
): SalesLogStatus {
  if (payments.length === 0) return "PENDING";
  const statuses = payments.map((p) => p.status);
  if (statuses.every((s) => s === "APPROVED")) return "APPROVED";
  if (statuses.every((s) => s === "REJECTED")) return "REJECTED";
  if (statuses.some((s) => s === "PENDING")) return "PENDING";
  return "PARTIAL";
}

export function validatePaymentInputs(payments: PaymentInput[]) {
  const active = payments.filter((p) => Number(p.amount) > 0);
  if (active.length === 0) {
    throw new DomainError(400, "invalid_input", "At least one revenue amount must be greater than zero.");
  }

  for (const p of active) {
    if (!p.bankAccountId) {
      throw new DomainError(
        400,
        "invalid_input",
        `${p.method === "POS" ? "POS" : "Transfer"} bank account is required.`,
      );
    }
    if (p.method === "TRANSFER" && !p.receiptUrl?.trim()) {
      throw new DomainError(
        400,
        "invalid_input",
        "Transfer receipt image is required when a transfer amount is entered.",
      );
    }
  }

  return active;
}

export function paymentsFromLegacy(body: {
  amountPos?: number;
  amountTransfer?: number;
  posBankAccountId?: string | null;
  transferBankAccountId?: string | null;
  posReceiptUrl?: string | null;
  transferReceiptUrl?: string | null;
}): PaymentInput[] {
  const payments: PaymentInput[] = [];
  if (Number(body.amountPos) > 0) {
    payments.push({
      method: "POS",
      amount: Number(body.amountPos),
      bankAccountId: body.posBankAccountId || "",
      receiptUrl: body.posReceiptUrl ?? null,
    });
  }
  if (Number(body.amountTransfer) > 0) {
    payments.push({
      method: "TRANSFER",
      amount: Number(body.amountTransfer),
      bankAccountId: body.transferBankAccountId || "",
      receiptUrl: body.transferReceiptUrl ?? null,
    });
  }
  return payments;
}

export function resolvePaymentInputs(body: {
  payments?: PaymentInput[] | null;
  amountPos?: number;
  amountTransfer?: number;
  posBankAccountId?: string | null;
  transferBankAccountId?: string | null;
  posReceiptUrl?: string | null;
  transferReceiptUrl?: string | null;
}): PaymentInput[] {
  if (Array.isArray(body.payments) && body.payments.length > 0) {
    return body.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      method: p.method,
    }));
  }
  return paymentsFromLegacy(body);
}

export type StationLedgerSummary = {
  expectedRevenue: number;
  totalReceived: number;
  balance: number;
  overpayment: number;
  underpayment: number;
  totalSalesCount: number;
};

export async function computeStationLedger(
  stationId: string,
  tenantId: string
): Promise<StationLedgerSummary> {
  const logs = await prisma.salesLog.findMany({
    where: { stationId, tenantId, status: { not: "REJECTED" } },
    select: {
      id: true,
      litersSold: true,
      pricePerLiter: true,
      amountPos: true,
      amountTransfer: true,
      appliedCredit: true,
      isDebtRepayment: true,
      parentdeliveryId: true,
      payments: { select: { amount: true, status: true } },
    },
    orderBy: { logDate: "desc" },
  });

  const parents = logs.filter((r) => !r.isDebtRepayment && !r.parentdeliveryId);
  const children = logs.filter((r) => r.isDebtRepayment && r.parentdeliveryId);

  let expectedRevenue = 0;
  let totalReceived = 0;
  let overpayment = 0;
  let underpayment = 0;

  for (const p of parents) {
    const pExpected = Number(p.litersSold || 0) * Number(p.pricePerLiter || 0);
    expectedRevenue += pExpected;

    const pReceived =
      p.payments.length > 0
        ? p.payments
            .filter((pm) => pm.status !== "REJECTED")
            .reduce((sum, pm) => sum + Number(pm.amount), 0)
        : Number(p.amountPos || 0) + Number(p.amountTransfer || 0);

    const childRepayments = children.filter((c) => c.parentdeliveryId === p.id);
    const childTotal = childRepayments.reduce((sum, c) => {
      const cReceived =
        c.payments.length > 0
          ? c.payments
              .filter((pm) => pm.status !== "REJECTED")
              .reduce((s, pm) => s + Number(pm.amount), 0)
          : Number(c.amountPos || 0) + Number(c.amountTransfer || 0);
      return sum + cReceived;
    }, 0);

    const appliedCredit = Number(p.appliedCredit || 0);
    const saleReceived = pReceived + childTotal + appliedCredit;
    totalReceived += saleReceived;

    const diff = saleReceived - pExpected;
    if (diff > 0) {
      overpayment += diff;
    } else if (diff < 0) {
      underpayment += Math.abs(diff);
    }
  }

  // Also include any orphan debt repayments if any exist
  const orphanChildren = children.filter(
    (c) => !parents.some((p) => p.id === c.parentdeliveryId)
  );
  for (const c of orphanChildren) {
    const cReceived =
      c.payments.length > 0
        ? c.payments
            .filter((pm) => pm.status !== "REJECTED")
            .reduce((s, pm) => s + Number(pm.amount), 0)
        : Number(c.amountPos || 0) + Number(c.amountTransfer || 0);
    totalReceived += cReceived;
    overpayment += cReceived;
  }

  return {
    expectedRevenue,
    totalReceived,
    balance: totalReceived - expectedRevenue,
    overpayment,
    underpayment,
    totalSalesCount: parents.length,
  };
}

export async function computeStationOverpayment(stationId: string, tenantId: string) {
  const ledger = await computeStationLedger(stationId, tenantId);
  return ledger.balance;
}

export function receivedFromPayments(
  payments: { amount: unknown; status: string }[],
  fallbackPos = 0,
  fallbackTransfer = 0,
  approvedOnly = false,
) {
  if (!payments.length) {
    return Number(fallbackPos) + Number(fallbackTransfer);
  }
  return payments
    .filter((p) => (approvedOnly ? p.status === "APPROVED" : p.status !== "REJECTED"))
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export async function syncSalesLogPaymentRollup(
  tx: Prisma.TransactionClient,
  salesLogId: string,
) {
  const payments = await tx.salesPayment.findMany({
    where: { salesLogId },
    select: { method: true, amount: true, status: true, receiptUrl: true, bankAccountId: true },
  });
  const { amountPos, amountTransfer } = sumsFromPayments(
    payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
  );
  const banks = firstBankIds(
    payments.map((p) => ({
      method: p.method,
      amount: Number(p.amount),
      bankAccountId: p.bankAccountId,
      receiptUrl: p.receiptUrl,
    })),
  );
  const status = rollupSalesLogStatus(payments);
  const approved = payments.filter((p) => p.status === "APPROVED");
  const latestApproved = approved.length === payments.length && payments.length > 0;

  return tx.salesLog.update({
    where: { id: salesLogId },
    data: {
      amountPos,
      amountTransfer,
      posBankAccountId: banks.posBankAccountId,
      transferBankAccountId: banks.transferBankAccountId,
      posReceiptUrl: banks.posReceiptUrl,
      transferReceiptUrl: banks.transferReceiptUrl,
      status,
      ...(latestApproved ? {} : {}),
    },
  });
}
