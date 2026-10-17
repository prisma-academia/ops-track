-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('LOCAL', 'DEPOT');

-- CreateEnum
CREATE TYPE "LossEconomicImpact" AS ENUM ('COMPANY_PNL', 'TRANSPORTER_RECOVERY', 'SUPPLIER_CREDIT', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "LossLogSource" AS ENUM ('MANUAL_LOG', 'DELIVERY_VARIANCE', 'SYSTEM_RECOMPUTE');

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "supplierType" "SupplierType";

-- AlterTable
ALTER TABLE "fleet_orders" ADD COLUMN "supplierShortageLiters" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "fleet_transport_loss_logs" ADD COLUMN "economicImpact" "LossEconomicImpact",
ADD COLUMN "source" "LossLogSource";
