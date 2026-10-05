-- AlterTable
ALTER TABLE "sales_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sales_logs" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_logs_createdAt_idx" ON "sales_logs"("createdAt");

-- Backfill historical records created from Dipping Closings:
UPDATE "sales_logs" sl
SET "createdAt" = dc."recordedAt"
FROM "dipping_closings" dc
WHERE sl."dippingClosingId" = dc."id" 
  AND dc."recordedAt" IS NOT NULL;

-- Backfill historical records created from Sales Payments:
UPDATE "sales_logs" sl
SET "createdAt" = sp."createdAt"
FROM (
  SELECT "salesLogId", MIN("createdAt") AS "createdAt"
  FROM "sales_payments"
  GROUP BY "salesLogId"
) sp
WHERE sl."id" = sp."salesLogId" 
  AND sl."dippingClosingId" IS NULL;
