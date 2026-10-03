import "dotenv/config";
import { rawPrisma } from "@/lib/db/raw-client";

/**
 * 100% NON-DESTRUCTIVE SAFE MIGRATION
 * Only adds the two new columns with default values if they don't exist.
 * Never touches, alters, or drops any existing tables or rows.
 */
async function main() {
  console.log("Adding non-destructive columns to fleet_sales table...");

  await rawPrisma.$executeRawUnsafe(`
    ALTER TABLE fleet_sales 
    ADD COLUMN IF NOT EXISTS "litersReturned" DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
  `);
  console.log("✔ Column 'litersReturned' verified/added.");

  await rawPrisma.$executeRawUnsafe(`
    ALTER TABLE fleet_sales 
    ADD COLUMN IF NOT EXISTS "shortageDeducted" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("✔ Column 'shortageDeducted' verified/added.");

  console.log("Done! No existing data was modified or deleted.");
  await rawPrisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
