import { spawnSync } from "child_process";
import "dotenv/config";

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

async function run() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const dbUrl = process.env.DATABASE_URL;
  const isProd = nodeEnv === "production";
  const isRemoteDb = !isLocalhost(dbUrl);
  const allowDangerousReset = process.env.ALLOW_DANGEROUS_RESET === "true";

  console.log("\n⚠️  [db:reset] INITIATING DATABASE RESET...\n");

  if (isProd) {
    console.error("❌ CRITICAL: NODE_ENV is set to 'production'!");
    console.error("❌ Database reset is strictly blocked in production mode.\n");
    process.exit(1);
  }

  if (isRemoteDb && !allowDangerousReset) {
    console.error("❌ BLOCKED: DATABASE_URL appears to point to a remote database:");
    try {
      const parsed = new URL(dbUrl || "");
      console.error(`   Host: ${parsed.hostname}:${parsed.port || 5432}`);
      console.error(`   Database: ${parsed.pathname.replace("/", "")}`);
    } catch {
      console.error("   (Invalid or unparseable URL)");
    }
    console.error("\n   Running db:reset will DESTROY all data on this database!");
    console.error("   If you are 100% sure you want to reset this remote database, re-run with:");
    console.error("   ALLOW_DANGEROUS_RESET=true npm run db:reset\n");
    process.exit(1);
  }

  console.log("⚡ Proceeding with database schema reset & re-seed...");
  const pushResult = spawnSync(
    "npx",
    ["prisma", "db", "push", "--force-reset", "--accept-data-loss"],
    { stdio: "inherit", shell: true }
  );

  if (pushResult.status !== 0) {
    console.error("❌ Failed to push schema during reset.");
    process.exit(pushResult.status || 1);
  }

  console.log("\n🌱 Seeding database...");
  const seedResult = spawnSync("npx", ["prisma", "db", "seed"], {
    stdio: "inherit",
    shell: true,
  });

  if (seedResult.status !== 0) {
    console.error("❌ Failed to seed database after reset.");
    process.exit(seedResult.status || 1);
  }

  console.log("\n✅ Database reset and seed completed successfully.\n");
}

run().catch((e) => {
  console.error("Unexpected error during safe-db-reset:", e);
  process.exit(1);
});
