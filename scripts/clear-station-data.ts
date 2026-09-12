/**
 * clear-station-data.ts
 *
 * ⚠️  DESTRUCTIVE – removes dipping and stock data across ALL tenants.
 *
 * What this script removes (in FK-safe order):
 *   1.  TankDippings
 *   2.  DippingSessions (and cascading DippingClosings)
 *   3.  StockMovements
 *   4.  Empties all Tanks (sets currentLiters to 0.00)
 *
 * Stations, tank configuration, pumps, and nozzles are NOT deleted. Tanks are
 * retained but emptied.
 *
 * Usage (remote DB requires the env flag):
 *   ALLOW_DANGEROUS_RESET=true npx tsx scripts/clear-station-data.ts
 */

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

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
    "\n   This script will PERMANENTLY DELETE dipping and stock records and empty all tanks."
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
  console.log("\n⚠️  [clear-station-data] Starting dipping and stock reset...\n");

  const [tankDippingCount, dippingSessionCount, stockMovementCount, tankCount] =
    await Promise.all([
      prisma.tankDipping.count(),
      prisma.dippingSession.count(),
      prisma.stockMovement.count(),
      prisma.tank.count(),
    ]);

  console.log("📊 Records to be removed or reset:");
  console.table({
    "Tank Dippings": tankDippingCount,
    "Dipping Sessions": dippingSessionCount,
    "Stock Movements": stockMovementCount,
    "Tanks to empty": tankCount,
  });

  if (tankDippingCount + dippingSessionCount + stockMovementCount + tankCount === 0) {
    console.log("\n✅ Nothing to remove or reset – database is already clean.\n");
    return;
  }

  console.log("\n⏳ Removing dipping and stock data...\n");

  const d1 = await prisma.tankDipping.deleteMany({});
  console.log(`  ✔ TankDippings            : ${d1.count}`);

  await prisma.$executeRaw`UPDATE sales_logs SET "dippingClosingId" = NULL WHERE "dippingClosingId" IS NOT NULL`;
  console.log("  ✔ Cleared SalesLog dipping-closing references");

  const d2 = await prisma.dippingSession.deleteMany({});
  console.log(`  ✔ DippingSessions         : ${d2.count}`);

  const d3 = await prisma.stockMovement.deleteMany({});
  console.log(`  ✔ StockMovements          : ${d3.count}`);

  const d4 = await prisma.tank.updateMany({
    data: { currentLiters: 0 },
  });
  console.log(`  ✔ Tanks emptied           : ${d4.count}`);

  const deletedTotal =
    d1.count + d2.count + d3.count;

  console.log(`\n✅ Done!  Removed ${deletedTotal.toLocaleString()} records and emptied ${d4.count.toLocaleString()} tanks.\n`);
  console.log(
    "   Stations, tank configurations, pumps, nozzles, Tenants, Users, Customers, Fleet data, and all other\n" +
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
