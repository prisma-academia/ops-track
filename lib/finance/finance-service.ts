import { prisma } from "@/lib/db/client";
import {
  Prisma,
  TransactionType,
  TransactionCategory,
} from "@/lib/generated/prisma/client";

export const FinanceService = {
  /**
   * Records revenue generated from a retail station sale (SalesLog)
   */
  async recordRetailSaleRevenue(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      stationId: string;
      salesLogId: string;
      amountPos?: Prisma.Decimal | number;
      amountTransfer?: Prisma.Decimal | number;
      posBankAccountId?: string | null;
      transferBankAccountId?: string | null;
      payments?: {
        method: "POS" | "TRANSFER";
        amount: Prisma.Decimal | number;
        bankAccountId?: string | null;
      }[];
      description?: string;
    },
  ) {
    const lines =
      params.payments && params.payments.length > 0
        ? params.payments.filter((p) => Number(p.amount) > 0)
        : [
            ...(Number(params.amountPos) > 0
              ? [
                  {
                    method: "POS" as const,
                    amount: params.amountPos!,
                    bankAccountId: params.posBankAccountId || null,
                  },
                ]
              : []),
            ...(Number(params.amountTransfer) > 0
              ? [
                  {
                    method: "TRANSFER" as const,
                    amount: params.amountTransfer!,
                    bankAccountId: params.transferBankAccountId || null,
                  },
                ]
              : []),
          ];

    return Promise.all(
      lines.map((line) =>
        tx.transaction.create({
          data: {
            tenantId: params.tenantId,
            stationId: params.stationId,
            salesLogId: params.salesLogId,
            type: TransactionType.INFLOW,
            category: TransactionCategory.STATION_SALE,
            amount: line.amount,
            paymentPurpose:
              line.method === "POS"
                ? "Retail Sale POS Settlement"
                : "Retail Sale Transfer Settlement",
            description:
              params.description ||
              (line.method === "POS" ? "Retail sale via POS" : "Retail sale via Bank Transfer"),
            bankAccountId: line.bankAccountId || null,
          },
        }),
      ),
    );
  },

  /**
   * Records payment received for a wholesale product delivery
   */
  async recordWholesalePayment(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      deliveryId: string;
      organizationId?: string | null;
      customerId?: string | null;
      stationId?: string | null;
      amount: Prisma.Decimal | number;
      bankAccountId?: string | null;
      description?: string;
    },
  ) {
    if (Number(params.amount) <= 0) return null;

    return tx.transaction.create({
      data: {
        tenantId: params.tenantId,
        deliveryId: params.deliveryId,
        organizationId: params.organizationId || null,
        customerId: params.customerId || null,
        stationId: params.stationId || null,
        type: TransactionType.INFLOW,
        category: TransactionCategory.PRODUCT_SUPPLY,
        amount: params.amount,
        paymentPurpose: "Wholesale Delivery Payment",
        description:
          params.description || "Payment received for product delivery",
        bankAccountId: params.bankAccountId || null,
      },
    });
  },

  /**
   * Records payment made for a station or fleet expense
   */
  async recordExpensePayment(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      expenseId: string;
      context: "STATION" | "FLEET";
      stationId?: string | null;
      truckId?: string | null;
      amount: Prisma.Decimal | number;
      bankAccountId?: string | null;
      description?: string;
    },
  ) {
    if (Number(params.amount) <= 0) return null;

    return tx.transaction.create({
      data: {
        tenantId: params.tenantId,
        expenseId: params.expenseId,
        stationId: params.stationId || null,
        truckId: params.truckId || null,
        type: TransactionType.OUTFLOW,
        category:
          params.context === "STATION"
            ? TransactionCategory.STATION_EXPENSE
            : TransactionCategory.FLEET_EXPENSE,
        amount: params.amount,
        paymentPurpose:
          params.context === "STATION"
            ? "Station Expense Payment"
            : "Fleet Expense Payment",
        description:
          params.description ||
          `Payment for ${params.context.toLowerCase()} expense`,
        bankAccountId: params.bankAccountId || null,
      },
    });
  },
};
