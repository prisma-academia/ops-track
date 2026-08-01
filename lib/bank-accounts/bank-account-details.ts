import { prisma } from "@/lib/db/client";

export type BankTransactionItem = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  date: string;
  category: string;
  description: string;
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
}: {
  tenantId: string;
  bankAccountId: string;
  page?: number;
  pageSize?: number;
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
      orderBy: { createdAt: "desc" },
    });

    rawTransactions = fleetTxs.map((tx) => ({
      id: tx.id,
      type: tx.type === "INFLOW" ? "CREDIT" : "DEBIT",
      amount: Number(tx.amount),
      date: tx.createdAt.toISOString(),
      category: tx.category,
      description: tx.description || tx.paymentPurpose || "Fleet Transaction",
      reference: tx.reference,
      sourceModule: "FLEET_TRANSACTION",
      status: "COMPLETED",
    }));
  } else {
    // STATION scope bank account
    // 1. SalesLogs where bankAccountId, posBankAccountId, or transferBankAccountId is this account
    const salesLogs = await prisma.salesLog.findMany({
      where: {
        tenantId,
        OR: [

          { posBankAccountId: bankAccountId },
          { transferBankAccountId: bankAccountId },
        ],
        status: "APPROVED",
      },
      orderBy: { logDate: "desc" },
    });

    // 2. Expenses where bankAccountId matches
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        bankAccountId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
    });

    const salesTxItems: BankTransactionItem[] = salesLogs.map((s) => {
      let amount = 0;

      if (s.posBankAccountId === bankAccountId) amount += Number(s.amountPos || 0);
      if (s.transferBankAccountId === bankAccountId) amount += Number(s.amountTransfer || 0);

      return {
        id: s.id,
        type: "CREDIT",
        amount,
        date: s.logDate ? new Date(s.logDate).toISOString() : s.approvedAt?.toISOString() || new Date().toISOString(),
        category: "STATION_SALE",
        description: `Approved Sale (${s.productType})`,
        reference: s.id.slice(0, 8),
        sourceModule: "STATION_SALE",
        status: s.status,
      };
    });

    const expenseTxItems: BankTransactionItem[] = expenses.map((e) => ({
      id: e.id,
      type: "DEBIT",
      amount: Number(e.amount),
      date: e.createdAt.toISOString(),
      category: e.category,
      description: e.description || "Station Expense",
      reference: e.id.slice(0, 8),
      sourceModule: "STATION_EXPENSE",
      status: e.status,
    }));

    rawTransactions = [...salesTxItems, ...expenseTxItems].sort(
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

  // Pagination for transactions table
  const totalCount = rawTransactions.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedTransactions = rawTransactions.slice(
    startIndex,
    startIndex + pageSize
  );

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
