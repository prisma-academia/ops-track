/**
 * One-time backfill: create SalesPayment rows from legacy POS/transfer columns.
 * Run after `prisma db push` / generate:
 *   npx tsx scripts/backfill-sales-payments.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const logs = await prisma.salesLog.findMany({
    include: { payments: true },
  });

  let created = 0;
  for (const log of logs) {
    if (log.payments.length > 0) continue;

    const pos = Number(log.amountPos);
    const transfer = Number(log.amountTransfer);
    const status = log.status === "PARTIAL" ? "PENDING" : log.status;

    const rows: {
      tenantId: string;
      salesLogId: string;
      method: "POS" | "TRANSFER";
      amount: number;
      bankAccountId: string;
      receiptUrl: string | null;
      status: "PENDING" | "APPROVED" | "REJECTED";
      reason: string | null;
    }[] = [];

    if (pos > 0 && log.posBankAccountId) {
      rows.push({
        tenantId: log.tenantId,
        salesLogId: log.id,
        method: "POS",
        amount: pos,
        bankAccountId: log.posBankAccountId,
        receiptUrl: log.posReceiptUrl,
        status,
        reason: log.reason,
      });
    }
    if (transfer > 0 && log.transferBankAccountId) {
      rows.push({
        tenantId: log.tenantId,
        salesLogId: log.id,
        method: "TRANSFER",
        amount: transfer,
        bankAccountId: log.transferBankAccountId,
        receiptUrl: log.transferReceiptUrl,
        status,
        reason: log.reason,
      });
    }

    for (const row of rows) {
      const payment = await prisma.salesPayment.create({ data: row });
      created += 1;
      if ((status === "APPROVED" || status === "REJECTED") && log.approvedById && log.approvedAt) {
        await prisma.salesPaymentReview.create({
          data: {
            tenantId: log.tenantId,
            paymentId: payment.id,
            status,
            reason: log.reason,
            reviewedById: log.approvedById,
            reviewedAt: log.approvedAt,
          },
        });
      }
    }
  }

  console.log(`Backfilled ${created} sales payments from ${logs.length} sales logs.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
