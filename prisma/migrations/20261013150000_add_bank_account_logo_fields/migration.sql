-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "bankSlug" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "bankCode" TEXT;
