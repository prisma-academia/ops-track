/**
 * clear-station-data.ts
 *
 * ⚠️  DESTRUCTIVE – deletes ALL station operational data across ALL tenants.
 *
 * What this script removes (in FK-safe order):
 *   1.  NotificationDeliveries & NotificationMessages
 *   2.  SalesPaymentReviews
 *   3.  SalesPayments
 *   4.  DippingClosings  (references SalesLog via unique FK)
 *   5.  SalesLogs        (and nullifies dippingClosingId first)
 *   6.  Transactions     (fleet_transactions)
 *   7.  TicketSpendRevisions
 *   8.  VarianceLogs
 *   9.  Tickets
 *   10. Expenses
 *   11. ShiftLogs
 *   12. WaybillDippings
 *   13. WaybillAllocations
 *   14. Waybills
 *   15. TankDippings
 *   16. DippingSessions
 *   17. StockMovements
 *   18. DailyStockReports
 *   19. Nozzles -> Pumps -> Tanks
 *   20. PriceControls (station-scoped)
 *   21. StationBankAccounts (junction)
 *   22. BankAccounts
 *
 * Stations themselves are NOT deleted – only their operational data.
 *
 * Usage (remote DB requires the env flag):
 *   ALLOW_DANGEROUS_RESET=true npx tsx scripts/clear-station-data.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// ─── Safety guards ──────────────────────────────────────────────────────────

function isLocalhost(urlStr?: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

const dbUrl = process.env.DATABASE_URL;
const isRemoteDb = !isLocalhost(dbUrl);
const allowDangerous = process.env.ALLOW_DANGEROUS_RESET === "true";

if (isRemoteDb && !allowDangerous) {
  try {
    const parsed = new URL(dbUrl || "");
    console.error("\n❌ BLOCKED: DATABASE_URL points to a REMOTE database:");
    console.error(`   Host     : ${parsed.hostname}:${parsed.port || 5432}`);
    console.error(`   Database : ${parsed.pathname.replace("/", "")}`);
  } catch {
    console.error("\n❌ BLOCKED: DATABASE_URL is unparseable / remote.");
  }
  console.error(
    "\n   This script will PERMANENTLY DELETE all station operational data."
  );
  console.error("   If you are absolutely sure, re-run with:\n");
  console.error(
    "   ALLOW_DANGEROUS_RESET=true npx tsx scripts/clear-station-data.ts\n"
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error(
    "\n❌ CRITICAL: NODE_ENV=production. This script is blocked in production.\n"
  );
  process.exit(1);
}

// ─── Prisma client (raw – no tenant-scope extension) ────────────────────────

const adapter = new PrismaPg({ connectionString: dbUrl! });
const prisma = new PrismaClient({ adapter });

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n⚠️  [clear-station-data] Starting destructive data wipe...\n");

  // ── Preview counts ───────────────────────────────────────────────────────
  const [
    notifDeliveryCount,
    notifMessageCount,
    salesPaymentReviewCount,
    salesPaymentCount,
    dippingClosingCount,
    salesLogCount,
    transactionCount,
    ticketSpendRevisionCount,
    varianceLogCount,
    ticketCount,
    expenseCount,
    shiftLogCount,
    waybillDippingCount,
    waybillAllocationCount,
    waybillCount,
    tankDippingCount,
    dippingSessionCount,
    stockMovementCount,
    dailyStockReportCount,
    nozzleCount,
    pumpCount,
    tankCount,
    priceControlCount,
    stationBankAccountCount,
    bankAccountCount,
  ] = await Promise.all([
    prisma.notificationDelivery.count(),
    prisma.notificationMessage.count(),
    prisma.salesPaymentReview.count(),
    prisma.salesPayment.count(),
    prisma.dippingClosing.count(),
    prisma.salesLog.count(),
    prisma.transaction.count(),
    prisma.ticketSpendRevision.count(),
    prisma.varianceLog.count(),
    prisma.ticket.count(),
    prisma.expense.count(),
    prisma.shiftLog.count(),
    prisma.waybillDipping.count(),
    prisma.waybillAllocation.count(),
    prisma.waybill.count(),
    prisma.tankDipping.count(),
    prisma.dippingSession.count(),
    prisma.stockMovement.count(),
    prisma.dailyStockReport.count(),
    prisma.nozzle.count(),
    prisma.pump.count(),
    prisma.tank.count(),
    prisma.priceControl.count(),
    prisma.stationBankAccount.count(),
    prisma.bankAccount.count(),
  ]);

  console.log("📊 Records to be deleted:");
  console.table({
    "Notification Deliveries": notifDeliveryCount,
    "Notification Messages":   notifMessageCount,
    "Sales Payment Reviews":   salesPaymentReviewCount,
    "Sales Payments":          salesPaymentCount,
    "Dipping Closings":        dippingClosingCount,
    "Sales Logs":              salesLogCount,
    Transactions:              transactionCount,
    "Ticket Spend Revisions":  ticketSpendRevisionCount,
    "Variance Logs":           varianceLogCount,
    Tickets:                   ticketCount,
    Expenses:                  expenseCount,
    "Shift Logs":              shiftLogCount,
    "Waybill Dippings":        waybillDippingCount,
    "Waybill Allocations":     waybillAllocationCount,
    Waybills:                  waybillCount,
    "Tank Dippings":           tankDippingCount,
    "Dipping Sessions":        dippingSessionCount,
    "Stock Movements":         stockMovementCount,
    "Daily Stock Reports":     dailyStockReportCount,
    Nozzles:                   nozzleCount,
    Pumps:                     pumpCount,
    Tanks:                     tankCount,
    "Price Controls":          priceControlCount,
    "Station Bank Accounts":   stationBankAccountCount,
    "Bank Accounts":           bankAccountCount,
  });

  const total =
    notifDeliveryCount + notifMessageCount + salesPaymentReviewCount +
    salesPaymentCount + dippingClosingCount + salesLogCount + transactionCount +
    ticketSpendRevisionCount + varianceLogCount + ticketCount + expenseCount +
    shiftLogCount + waybillDippingCount + waybillAllocationCount + waybillCount +
    tankDippingCount + dippingSessionCount + stockMovementCount +
    dailyStockReportCount + nozzleCount + pumpCount + tankCount +
    priceControlCount + stationBankAccountCount + bankAccountCount;

  if (total === 0) {
    console.log("\n✅ Nothing to delete – database is already clean.\n");
    return;
  }

  console.log(`\n🔢 Total: ${total.toLocaleString()} records\n`);
  console.log("⏳ Deleting in FK-safe order...\n");

  // 1. Notification deliveries & messages
  const d1 = await prisma.notificationDelivery.deleteMany({});
  console.log(`  ✔ NotificationDeliveries  : ${d1.count}`);

  const d2 = await prisma.notificationMessage.deleteMany({});
  console.log(`  ✔ NotificationMessages    : ${d2.count}`);

  // 2. Sales payment reviews (leaf of SalesPayment)
  const d3 = await prisma.salesPaymentReview.deleteMany({});
  console.log(`  ✔ SalesPaymentReviews     : ${d3.count}`);

  // 3. SalesPayments (child of SalesLog, references BankAccount)
  const d4 = await prisma.salesPayment.deleteMany({});
  console.log(`  ✔ SalesPayments           : ${d4.count}`);

  // 4. Break circular SalesLog ↔ DippingClosing FK before deleting either.
  //    DippingClosing.generateddeliveryId → SalesLog (unique)
  //    SalesLog.dippingClosingId          → DippingClosing (unique)
  await prisma.$executeRaw`UPDATE sales_logs SET "dippingClosingId" = NULL WHERE "dippingClosingId" IS NOT NULL`;
  console.log(`  ✔ Nullified SalesLog.dippingClosingId  (circular FK cleared)`);

  const d5 = await prisma.dippingClosing.deleteMany({});
  console.log(`  ✔ DippingClosings         : ${d5.count}`);

  // 5. Transactions (reference SalesLog, Expense, Delivery, etc. via SetNull – safe first)
  const d6 = await prisma.transaction.deleteMany({});
  console.log(`  ✔ Transactions            : ${d6.count}`);

  // 6. SalesLogs (payments, closings, transactions already gone)
  const d7 = await prisma.salesLog.deleteMany({});
  console.log(`  ✔ SalesLogs               : ${d7.count}`);

  // 7. TicketSpendRevisions (child of Ticket)
  const d8 = await prisma.ticketSpendRevision.deleteMany({});
  console.log(`  ✔ TicketSpendRevisions    : ${d8.count}`);

  // 8. VarianceLogs (child of Ticket, also refs Tank/Waybill via SetNull)
  const d9 = await prisma.varianceLog.deleteMany({});
  console.log(`  ✔ VarianceLogs            : ${d9.count}`);

  // 9. Null out Ticket.expenseId so we can delete Expenses before Tickets
  await prisma.$executeRaw`UPDATE tickets SET "expenseId" = NULL WHERE "expenseId" IS NOT NULL`;
  console.log(`  ✔ Nullified Ticket.expenseId`);

  const d10 = await prisma.expense.deleteMany({});
  console.log(`  ✔ Expenses                : ${d10.count}`);

  // 10. Tickets (self-referencing parent via SetNull – safe)
  const d11 = await prisma.ticket.deleteMany({});
  console.log(`  ✔ Tickets                 : ${d11.count}`);

  // 11. ShiftLogs
  const d12 = await prisma.shiftLog.deleteMany({});
  console.log(`  ✔ ShiftLogs               : ${d12.count}`);

  // 12. WaybillDippings
  const d13 = await prisma.waybillDipping.deleteMany({});
  console.log(`  ✔ WaybillDippings         : ${d13.count}`);

  // 13. WaybillAllocations
  const d14 = await prisma.waybillAllocation.deleteMany({});
  console.log(`  ✔ WaybillAllocations      : ${d14.count}`);

  // 14. Waybills
  const d15 = await prisma.waybill.deleteMany({});
  console.log(`  ✔ Waybills                : ${d15.count}`);

  // 15. TankDippings
  const d16 = await prisma.tankDipping.deleteMany({});
  console.log(`  ✔ TankDippings            : ${d16.count}`);

  // 16. DippingSessions (closings already gone)
  const d17 = await prisma.dippingSession.deleteMany({});
  console.log(`  ✔ DippingSessions         : ${d17.count}`);

  // 17. StockMovements
  const d18 = await prisma.stockMovement.deleteMany({});
  console.log(`  ✔ StockMovements          : ${d18.count}`);

  // 18. DailyStockReports
  const d19 = await prisma.dailyStockReport.deleteMany({});
  console.log(`  ✔ DailyStockReports       : ${d19.count}`);

  // 19. Nozzles → Pumps → Tanks (cascade order)
  const d20 = await prisma.nozzle.deleteMany({});
  console.log(`  ✔ Nozzles                 : ${d20.count}`);

  const d21 = await prisma.pump.deleteMany({});
  console.log(`  ✔ Pumps                   : ${d21.count}`);

  const d22 = await prisma.tank.deleteMany({});
  console.log(`  ✔ Tanks                   : ${d22.count}`);

  // 20. PriceControls (station-scoped; no remaining children)
  const d23 = await prisma.priceControl.deleteMany({});
  console.log(`  ✔ PriceControls           : ${d23.count}`);

  // 21. StationBankAccounts (junction table)
  const d24 = await prisma.stationBankAccount.deleteMany({});
  console.log(`  ✔ StationBankAccounts     : ${d24.count}`);

  // 22. BankAccounts (all FK referrers already gone)
  const d25 = await prisma.bankAccount.deleteMany({});
  console.log(`  ✔ BankAccounts            : ${d25.count}`);

  const deletedTotal =
    d1.count + d2.count + d3.count + d4.count + d5.count + d6.count +
    d7.count + d8.count + d9.count + d10.count + d11.count + d12.count +
    d13.count + d14.count + d15.count + d16.count + d17.count + d18.count +
    d19.count + d20.count + d21.count + d22.count + d23.count + d24.count +
    d25.count;

  console.log(`\n✅ Done!  Deleted ${deletedTotal.toLocaleString()} records total.\n`);
  console.log(
    "   Stations, Tenants, Users, Customers, Fleet data, and all other\n" +
    "   non-station-operational records are untouched.\n"
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
