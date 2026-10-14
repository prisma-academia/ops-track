-- AlterEnum (idempotent: skip if already added)
DO $$ BEGIN
  ALTER TYPE "TransactionCategory" ADD VALUE 'SUPPLIER_PAYMENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expand suppliers (tenant-scoped)
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "lga" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contactPosition" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "depositBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- Allow same supplier name per tenant (drop global unique before backfill)
DROP INDEX IF EXISTS "suppliers_name_key";

-- Link legacy global supplier rows to a tenant when unambiguous
UPDATE "suppliers" s
SET "tenantId" = sub."tenantId"
FROM (
  SELECT UPPER(TRIM(o."supplier")) AS name, MIN(o."tenantId") AS "tenantId"
  FROM "fleet_orders" o
  WHERE o."supplier" IS NOT NULL AND TRIM(o."supplier") <> ''
  GROUP BY UPPER(TRIM(o."supplier"))
  HAVING COUNT(DISTINCT o."tenantId") = 1
) sub
WHERE s."tenantId" IS NULL AND UPPER(TRIM(s."name")) = sub.name;

-- Per-tenant supplier rows from fleet orders (only when not already covered)
INSERT INTO "suppliers" ("id", "tenantId", "name", "createdAt")
SELECT gen_random_uuid()::text, grouped."tenantId", grouped.name, NOW()
FROM (
  SELECT DISTINCT o."tenantId", UPPER(TRIM(o."supplier")) AS name
  FROM "fleet_orders" o
  WHERE o."supplier" IS NOT NULL AND TRIM(o."supplier") <> ''
) grouped
WHERE NOT EXISTS (
  SELECT 1 FROM "suppliers" s
  WHERE s."tenantId" = grouped."tenantId"
    AND UPPER(TRIM(s."name")) = grouped.name
);

-- Remaining orphans: attach to first tenant
UPDATE "suppliers" s
SET "tenantId" = (SELECT "id" FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1)
WHERE s."tenantId" IS NULL;

ALTER TABLE "suppliers" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenantId_name_key" ON "suppliers"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "suppliers_tenantId_idx" ON "suppliers"("tenantId");

DO $$ BEGIN
  ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fleet order payables
ALTER TABLE "fleet_orders" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "fleet_orders" ADD COLUMN IF NOT EXISTS "paymentPaid" DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "fleet_orders" ADD COLUMN IF NOT EXISTS "paymentStatus" "SaleStatus" NOT NULL DEFAULT 'UNPAID';

UPDATE "fleet_orders" o
SET "supplierId" = s."id"
FROM "suppliers" s
WHERE o."supplierId" IS NULL
  AND o."supplier" IS NOT NULL
  AND TRIM(o."supplier") <> ''
  AND s."tenantId" = o."tenantId"
  AND UPPER(TRIM(s."name")) = UPPER(TRIM(o."supplier"));

CREATE INDEX IF NOT EXISTS "fleet_orders_supplierId_idx" ON "fleet_orders"("supplierId");

DO $$ BEGIN
  ALTER TABLE "fleet_orders" ADD CONSTRAINT "fleet_orders_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Supplier on transactions
ALTER TABLE "fleet_transactions" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
CREATE INDEX IF NOT EXISTS "fleet_transactions_supplierId_idx" ON "fleet_transactions"("supplierId");

DO $$ BEGIN
  ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
