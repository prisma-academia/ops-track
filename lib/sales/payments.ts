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

export async function computeStationOverpayment(stationId: string, tenantId: string) {
  const logs = await prisma.salesLog.findMany({
    where: { stationId, tenantId, status: { not: "REJECTED" } },
    select: {
      litersSold: true,
      pricePerLiter: true,
      amountPos: true,
      amountTransfer: true,
      payments: { select: { amount: true, status: true } },
    },
  });

  return logs.reduce((acc, log) => {
    const expected = Number(log.litersSold || 0) * Number(log.pricePerLiter || 0);
    const received =
      log.payments.length > 0
        ? log.payments
            .filter((p) => p.status !== "REJECTED")
            .reduce((sum, p) => sum + Number(p.amount), 0)
        : Number(log.amountPos || 0) + Number(log.amountTransfer || 0);
    return acc + (received - expected);
  }, 0);
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
