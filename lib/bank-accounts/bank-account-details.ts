import { prisma } from "@/lib/db/client";
import { resolveTransactionCounterpartyName } from "@/lib/finance/transaction-labels";

export type BankTransactionItem = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  date: string;
  category: string;
  description: string;
  payerName?: string | null;
  reference?: string | null;
  sourceModule: "FLEET_TRANSACTION" | "STATION_SALE" | "STATION_EXPENSE";
  status: string;
};

export type BankAccountAnalyticsPoint = {
  period: string; // e.g. "2026-07" or "Jul 2026"
  credited: number;
  debited: number;
  netFlow: number;
};

export async function getBankAccountDetailsData({
  tenantId,
  bankAccountId,
  page = 1,
  pageSize = 25,
  paginateTransactions = true,
}: {
  tenantId: string;
  bankAccountId: string;
  page?: number;
  pageSize?: number;
  paginateTransactions?: boolean;
}) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, tenantId },
  });

  if (!account) {
    return null;
  }

  // Fetch transactions depending on account scope or linked models
  let rawTransactions: BankTransactionItem[] = [];

  if (account.scope === "FLEET") {
    const fleetTxs = await prisma.transaction.findMany({
      where: { tenantId, bankAccountId },
      include: {
        customer: { select: { name: true } },
        station: { select: { name: true, code: true } },
        transporter: { select: { name: true } },
        delivery: {
          select: {
            customer: { select: { name: true } },
            station: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    rawTransactions = fleetTxs.map((tx) => ({
      id: tx.id,
      type: tx.type === "INFLOW" ? "CREDIT" : "DEBIT",
      amount: Number(tx.amount),
      date: tx.createdAt.toISOString(),
      category: tx.category,
      description: tx.description || tx.paymentPurpose || "Fleet Transaction",
      payerName: resolveTransactionCounterpartyName(tx),
      reference: tx.reference,
      sourceModule: "FLEET_TRANSACTION",
      status: "COMPLETED",
    }));
  } else {
    // STATION scope bank account
    // 1. SalesLogs where bankAccountId, posBankAccountId, or transferBankAccountId is this account
    const salesPayments = await prisma.salesPayment.findMany({
      where: {
        tenantId,
        bankAccountId,
        status: "APPROVED",
      },
      include: {
        salesLog: {
          select: {
            productType: true,
            logDate: true,
            station: { select: { name: true, code: true } },
            recordedBy: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        bankAccountId,
        status: "APPROVED",
      },
      include: {
        station: { select: { name: true, code: true } },
        recordedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const otherTxs = await prisma.transaction.findMany({
      where: {
        tenantId,
        bankAccountId,
        salesLogId: null,
        expenseId: null,
      },
      include: {
        customer: { select: { name: true } },
        station: { select: { name: true, code: true } },
        transporter: { select: { name: true } },
        delivery: {
          select: {
            customer: { select: { name: true } },
            station: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const salesTxItems: BankTransactionItem[] = salesPayments.map((p) => {
      const station = p.salesLog.station;
      const stationName = station
        ? (station.code ? `${station.name} (${station.code})` : station.name)
        : null;
      const recordedBy = p.salesLog.recordedBy;
      const recordedByName = recordedBy
        ? `${recordedBy.firstName || ""} ${recordedBy.lastName || ""}`.trim() || recordedBy.email
        : null;

      return {
        id: p.id,
        type: "CREDIT",
        amount: Number(p.amount),
        date: p.salesLog.logDate
          ? new Date(p.salesLog.logDate).toISOString()
          : p.createdAt.toISOString(),
        category: "STATION_SALE",
        description: `Approved ${p.method} sale (${p.salesLog.productType})`,
        payerName: stationName || recordedByName || null,
        reference: p.id.slice(0, 8),
        sourceModule: "STATION_SALE",
        status: p.status,
      };
    });

    const expenseTxItems: BankTransactionItem[] = expenses.map((e) => {
      const station = e.station;
      const stationName = station
        ? (station.code ? `${station.name} (${station.code})` : station.name)
        : null;
      const recordedBy = e.recordedBy;
      const recordedByName = recordedBy
        ? `${recordedBy.firstName || ""} ${recordedBy.lastName || ""}`.trim() || recordedBy.email
        : null;

      return {
        id: e.id,
        type: "DEBIT",
        amount: Number(e.amount),
        date: e.createdAt.toISOString(),
        category: e.category,
        description: e.description || "Station Expense",
        payerName: stationName || recordedByName || null,
        reference: e.id.slice(0, 8),
        sourceModule: "STATION_EXPENSE",
        status: e.status,
      };
    });

    const otherTxItems: BankTransactionItem[] = otherTxs.map((tx) => ({
      id: tx.id,
      type: tx.type === "INFLOW" ? "CREDIT" : "DEBIT",
      amount: Number(tx.amount),
      date: tx.createdAt.toISOString(),
      category: tx.category,
      description: tx.description || tx.paymentPurpose || "Station Transaction",
      payerName: resolveTransactionCounterpartyName(tx),
      reference: tx.reference,
      sourceModule: "FLEET_TRANSACTION",
      status: "COMPLETED",
    }));

    rawTransactions = [...salesTxItems, ...expenseTxItems, ...otherTxItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Summary Metrics
  let totalCredited = 0;
  let totalDebited = 0;

  rawTransactions.forEach((tx) => {
    if (tx.type === "CREDIT") totalCredited += tx.amount;
    if (tx.type === "DEBIT") totalDebited += tx.amount;
  });

  const netBalance = totalCredited - totalDebited;

  // Monthly Analytics (grouped by YYYY-MM)
  const analyticsMap = new Map<string, { credited: number; debited: number }>();

  rawTransactions.forEach((tx) => {
    const monthKey = tx.date.slice(0, 7); // e.g. "2026-07"
    const current = analyticsMap.get(monthKey) || { credited: 0, debited: 0 };
    if (tx.type === "CREDIT") current.credited += tx.amount;
    if (tx.type === "DEBIT") current.debited += tx.amount;
    analyticsMap.set(monthKey, current);
  });

  const sortedAnalytics: BankAccountAnalyticsPoint[] = Array.from(
    analyticsMap.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      period: month,
      credited: data.credited,
      debited: data.debited,
      netFlow: data.credited - data.debited,
    }));

  // Pagination for transactions table (optional — detail UIs load all rows for client-side table)
  const totalCount = rawTransactions.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = paginateTransactions ? (page - 1) * pageSize : 0;
  const paginatedTransactions = paginateTransactions
    ? rawTransactions.slice(startIndex, startIndex + pageSize)
    : rawTransactions;

  return {
    account: {
      id: account.id,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      scope: account.scope,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    },
    summary: {
      totalCredited,
      totalDebited,
      netBalance,
      transactionCount: totalCount,
    },
    analytics: sortedAnalytics,
    transactions: paginatedTransactions,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
