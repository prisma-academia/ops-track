-- CreateEnum
CREATE TYPE "AppModule" AS ENUM ('STATION', 'FLEET');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'TENANT');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PLATFORM_USER', 'TENANT_USER', 'CLIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SessionUserType" AS ENUM ('PLATFORM', 'TENANT', 'CLIENT');

-- CreateEnum
CREATE TYPE "SessionScope" AS ENUM ('FULL', 'MUST_CHANGE_PASSWORD');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('CLIENT_LOGIN', 'CLIENT_SIGNUP', 'TENANT_REGISTRATION', 'TENANT_OWNER_CHANGE_EMAIL');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'NEGOTIATING', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PMS', 'AGO', 'DPK', 'LPG');

-- CreateEnum
CREATE TYPE "SalesLogStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SalesPaymentMethod" AS ENUM ('POS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "DipShift" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "DippingType" AS ENUM ('OPENING', 'CLOSING');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketOrigin" AS ENUM ('SYSTEM', 'MOBILE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('INVENTORY_VARIANCE', 'EQUIPMENT_FAULT', 'CASH_DISCREPANCY', 'INCIDENT_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "StationRole" AS ENUM ('MANAGER', 'SUPERVISOR', 'CASHIER', 'ATTENDANT', 'OPERATION_MANAGER');

-- CreateEnum
CREATE TYPE "WaybillStatus" AS ENUM ('DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL_FOR_GEN', 'MAINTENANCE', 'UTILITIES', 'STATIONERY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'POS', 'BANK_TRANSFER', 'CHEQUE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'ISSUE');

-- CreateEnum
CREATE TYPE "VarianceType" AS ENUM ('TANK_DIPPING', 'WAYBILL_DELIVERY');

-- CreateEnum
CREATE TYPE "ExpenseContext" AS ENUM ('STATION', 'FLEET');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'LOSS');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('UNPAID', 'PART_PAID', 'CLEARED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "TransportFeeLeg" AS ENUM ('ORIGIN_TO_DEPOT', 'DEPOT_TO_PRIMARY', 'PRIMARY_TO_SUBSEQUENT', 'FULL_TRIP');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('TRANSPORT_PAYMENT', 'CLIENT_PAYMENT', 'PRODUCT_SUPPLY', 'STATION_SALE', 'STATION_EXPENSE', 'FLEET_EXPENSE', 'EXPENSE', 'OTHER_INFLOW', 'OTHER_OUTFLOW', 'OTHER', 'ASSET_PURCHASE', 'SALARY_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE_DEPOSIT', 'PART_PAYMENT', 'FULL_SETTLEMENT', 'DEBT_CLEARANCE');

-- CreateEnum
CREATE TYPE "TransporterOwnership" AS ENUM ('COMPANY_OWNED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "LossType" AS ENUM ('THEFT', 'MAINTENANCE', 'ACCIDENT', 'SPILL', 'LEAKAGE', 'SHORTAGE', 'CONTAMINATION', 'OTHERS');

-- CreateEnum
CREATE TYPE "DippingSessionStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClosingReason" AS ENUM ('END_OF_DAY', 'PRICE_CHANGE', 'ROUTINE');

-- CreateEnum
CREATE TYPE "AccountScope" AS ENUM ('STATION', 'FLEET');

-- CreateEnum
CREATE TYPE "TripLegType" AS ENUM ('ORIGIN_TO_DEPOT', 'DEPOT_TO_PRIMARY', 'PRIMARY_TO_SUBSEQUENT', 'SUBSEQUENT_TO_SUBSEQUENT', 'DESTINATION_TO_ORIGIN');

-- CreateEnum
CREATE TYPE "TripLegStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverAssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('OPENING_BALANCE', 'DELIVERY', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'LOSS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'MESSAGE', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationAudienceType" AS ENUM ('ALL_MODULE_USERS', 'STATION', 'ORGANIZATION', 'USERS');

-- CreateEnum
CREATE TYPE "NotificationMessageStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "tenant_modules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "settings" JSONB,

    CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerUserId" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "settingsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "trialExtensions" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "activeModules" TEXT[] DEFAULT ARRAY['FLEET', 'STATION']::TEXT[],

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "receiptRef" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companySize" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "interestedIn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "message" TEXT,
    "assignedTo" TEXT,
    "reviewNotes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "convertedToTenantId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT,
    "lastName" TEXT,
    "otherName" TEXT,
    "phone" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "bannedReason" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "otherName" TEXT,
    "phone" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "activeModules" "AppModule"[] DEFAULT ARRAY['STATION', 'FLEET']::"AppModule"[],
    "stationPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fleetPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "expoPushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT,
    "lastName" TEXT,
    "otherName" TEXT,
    "phone" TEXT,
    "profileJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userType" "SessionUserType" NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingClientRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "otherName" TEXT,
    "phone" TEXT,
    "profileJson" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingClientRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "tenantId" TEXT,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" "AppModule" NOT NULL DEFAULT 'STATION',
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "module" "AppModule" NOT NULL DEFAULT 'STATION',
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "SessionUserType" NOT NULL,
    "tenantId" TEXT,
    "scope" "SessionScope" NOT NULL DEFAULT 'FULL',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordHistory" (
    "id" TEXT NOT NULL,
    "userType" "SessionUserType" NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservedSlug" (
    "slug" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservedSlug_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'EXTERNAL',
    "logoKey" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "address" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "depositBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactPosition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "ward" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "altitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tanks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "capacity" DECIMAL(12,2) NOT NULL,
    "currentLiters" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "waterLevel" DECIMAL(12,2),
    "temperature" DECIMAL(6,2),
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "tanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_controls" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "stationId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "pricePerLiter" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "litersSold" DECIMAL(12,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amountPos" DECIMAL(12,2) NOT NULL,
    "amountTransfer" DECIMAL(12,2) NOT NULL,
    "appliedCredit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "posReceiptUrl" TEXT,
    "transferReceiptUrl" TEXT,
    "logDate" DATE NOT NULL,
    "status" "SalesLogStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isDebtRepayment" BOOLEAN NOT NULL DEFAULT false,
    "parentdeliveryId" TEXT,
    "dippingClosingId" TEXT,
    "posBankAccountId" TEXT,
    "transferBankAccountId" TEXT,

    CONSTRAINT "sales_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "salesLogId" TEXT NOT NULL,
    "method" "SalesPaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" "SalesLogStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payment_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "SalesLogStatus" NOT NULL,
    "reason" TEXT,
    "reviewedById" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_payment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stock_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "openingStockPms" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "openingStockAgo" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "openingStockDpk" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "soldPms" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "soldAgo" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "soldDpk" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_stock_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tank_dippings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dailyStockReportId" TEXT,
    "tankId" TEXT NOT NULL,
    "shift" "DipShift",
    "dippingType" "DippingType",
    "dippingLiters" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tank_dippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "category" "TicketCategory" NOT NULL,
    "origin" "TicketOrigin" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "remark" TEXT,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "pumpId" TEXT,
    "nozzleId" TEXT,
    "parentTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variance_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "varianceType" "VarianceType" NOT NULL,
    "expectedVolume" DECIMAL(12,2) NOT NULL,
    "actualVolume" DECIMAL(12,2) NOT NULL,
    "varianceVolume" DECIMAL(12,2) NOT NULL,
    "tankId" TEXT,
    "waybillId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactPosition" TEXT,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "depositBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waybills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "litersLoaded" DECIMAL(12,2) NOT NULL,
    "truckPlate" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT,
    "pictures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDatetime" TIMESTAMP(3),
    "supplier" TEXT,
    "depot" TEXT,
    "transportCompany" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "waybills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waybill_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "waybillId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "litersToDispense" DECIMAL(12,2) NOT NULL,
    "litersReceived" DECIMAL(12,2),
    "costPerLiter" DECIMAL(10,2) NOT NULL,
    "transportationCost" DECIMAL(12,2) NOT NULL,
    "status" "WaybillStatus" NOT NULL DEFAULT 'DISPATCHED',
    "gpsLatitude" DECIMAL(9,6),
    "gpsLongitude" DECIMAL(9,6),
    "arrivalPictures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "arrivalTime" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "truckNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "driverVerified" BOOLEAN NOT NULL DEFAULT false,
    "waybillVerified" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "deliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waybill_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pumps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "pumps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nozzles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pumpId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "nozzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "openingMeter" DECIMAL(12,2) NOT NULL,
    "closingMeter" DECIMAL(12,2),
    "litersSold" DECIMAL(12,2),
    "declaredCash" DECIMAL(12,2),
    "declaredPos" DECIMAL(12,2),
    "declaredTransfer" DECIMAL(12,2),
    "reconciledById" TEXT,
    "varianceLiters" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "varianceCash" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "reconciledAt" TIMESTAMP(3),
    "shiftDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "shift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "context" "ExpenseContext" NOT NULL DEFAULT 'STATION',
    "stationId" TEXT,
    "truckId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountId" TEXT,
    "recordedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waybill_dippings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "waybillId" TEXT NOT NULL,
    "waybillAllocationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "beforeLiters" DECIMAL(12,2) NOT NULL,
    "afterLiters" DECIMAL(12,2),
    "observations" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybill_dippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_transporters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "registrationNumber" TEXT,
    "businessType" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactPosition" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "ward" TEXT,
    "address" TEXT,
    "ownership" "TransporterOwnership" NOT NULL DEFAULT 'EXTERNAL',
    "kycDocuments" JSONB NOT NULL DEFAULT '{}',
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_transporters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_trucks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "truckNumber" TEXT,
    "plateNumber" TEXT,
    "truckBrand" TEXT,
    "model" TEXT,
    "truckType" TEXT,
    "fuelType" TEXT,
    "capacityLiters" DECIMAL(12,2) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_truck_maintenance_history" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_truck_maintenance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_drivers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiryDate" DATE,
    "address" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT,
    "productType" "ProductType" NOT NULL,
    "litersOrdered" DECIMAL(12,2) NOT NULL,
    "supplier" TEXT,
    "sourceDepot" TEXT,
    "pricePerLitre" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "loadingCostPerLitre" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_transports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT,
    "transporterId" TEXT,
    "truckId" TEXT,
    "driverId" TEXT,
    "isOneTime" BOOLEAN NOT NULL DEFAULT false,
    "oneTimeTransporterName" TEXT,
    "oneTimeTruckPlate" TEXT,
    "oneTimeDriverName" TEXT,
    "destination" TEXT NOT NULL,
    "productType" "ProductType",
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "litersCarried" DECIMAL(12,2) NOT NULL,
    "litersDelivered" DECIMAL(12,2),
    "maintenanceCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "litersLost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "netTransportFeePaid" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "comment" TEXT,
    "status" "TransportStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_transport_loss_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transportId" TEXT NOT NULL,
    "lossType" "LossType" NOT NULL,
    "lostQuantity" DECIMAL(12,2) NOT NULL,
    "expensesIncurred" DECIMAL(12,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_transport_loss_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "customerId" TEXT,
    "stationId" TEXT,
    "transportId" TEXT,
    "litersDespatched" DECIMAL(12,2) NOT NULL,
    "litersReceived" DECIMAL(12,2),
    "amountPerLiter" DECIMAL(10,2) NOT NULL,
    "totalExpectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "paymentReceived" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "transportRate" DECIMAL(10,2),
    "transportCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "transportCostBorneBy" TEXT NOT NULL DEFAULT 'CLIENT',
    "status" "SaleStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "paymentType" "PaymentType",
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentPurpose" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "paymentMethod" "PaymentMethod",
    "receiptUrl" TEXT,
    "organizationId" TEXT,
    "stationId" TEXT,
    "expenseId" TEXT,
    "salesLogId" TEXT,
    "bankAccountId" TEXT,
    "customerId" TEXT,
    "deliveryId" TEXT,
    "transporterId" TEXT,
    "transportId" TEXT,
    "truckId" TEXT,
    "orderId" TEXT,
    "feeLeg" "TransportFeeLeg",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dipping_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "openingLiters" DECIMAL(12,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,2) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DippingSessionStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "dipping_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dipping_closings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "closingLiters" DECIMAL(12,2) NOT NULL,
    "reason" "ClosingReason" NOT NULL,
    "newPricePerLiter" DECIMAL(10,2),
    "appliedPrice" DECIMAL(10,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generateddeliveryId" TEXT,

    CONSTRAINT "dipping_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "scope" "AccountScope" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "assignedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_trip_legs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transportId" TEXT NOT NULL,
    "type" "TripLegType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "status" "TripLegStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_trip_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_driver_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripLegId" TEXT NOT NULL,
    "status" "DriverAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "fleet_driver_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_transport_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "truckId" TEXT,
    "driverId" TEXT,
    "destination" TEXT NOT NULL,
    "litersRequested" DECIMAL(12,2) NOT NULL,
    "ratePerLiter" DECIMAL(10,2),
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "fleet_transport_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "productType" "ProductType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channel_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channel_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "audienceType" "NotificationAudienceType" NOT NULL,
    "audienceIds" TEXT[],
    "audienceActorType" "ActorType" NOT NULL DEFAULT 'TENANT_USER',
    "status" "NotificationMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL DEFAULT 'TENANT_USER',
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StationStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StationStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "tenant_modules_tenantId_idx" ON "tenant_modules"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_modules_tenantId_module_key" ON "tenant_modules"("tenantId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_trialEndsAt_idx" ON "Tenant"("trialEndsAt");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_status_idx" ON "tenant_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_endDate_idx" ON "tenant_subscriptions"("endDate");

-- CreateIndex
CREATE INDEX "demo_requests_status_idx" ON "demo_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_tenantId_email_key" ON "TenantUser"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "Client"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PendingClientRegistration_tenantId_idx" ON "PendingClientRegistration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingClientRegistration_tenantId_email_key" ON "PendingClientRegistration"("tenantId", "email");

-- CreateIndex
CREATE INDEX "RoleTemplate_scope_tenantId_module_idx" ON "RoleTemplate"("scope", "tenantId", "module");

-- CreateIndex
CREATE INDEX "RoleTemplate_organizationId_idx" ON "RoleTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityLog_tenantId_createdAt_idx" ON "ActivityLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "OtpRequest_identifier_createdAt_idx" ON "OtpRequest"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_tenantId_idx" ON "OtpRequest"("tenantId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Template_tenantId_type_idx" ON "Template"("tenantId", "type");

-- CreateIndex
CREATE INDEX "PasswordHistory_userType_userId_createdAt_idx" ON "PasswordHistory"("userType", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_scope_createdAt_idx" ON "LoginAttempt"("identifier", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "organizations_tenantId_idx" ON "organizations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_tenantId_slug_key" ON "organizations"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "stations_tenantId_idx" ON "stations"("tenantId");

-- CreateIndex
CREATE INDEX "stations_organizationId_idx" ON "stations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "stations_tenantId_code_key" ON "stations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "tanks_tenantId_idx" ON "tanks"("tenantId");

-- CreateIndex
CREATE INDEX "tanks_stationId_idx" ON "tanks"("stationId");

-- CreateIndex
CREATE INDEX "price_controls_tenantId_idx" ON "price_controls"("tenantId");

-- CreateIndex
CREATE INDEX "price_controls_organizationId_idx" ON "price_controls"("organizationId");

-- CreateIndex
CREATE INDEX "price_controls_stationId_idx" ON "price_controls"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_logs_dippingClosingId_key" ON "sales_logs"("dippingClosingId");

-- CreateIndex
CREATE INDEX "sales_logs_tenantId_idx" ON "sales_logs"("tenantId");

-- CreateIndex
CREATE INDEX "sales_logs_stationId_idx" ON "sales_logs"("stationId");

-- CreateIndex
CREATE INDEX "sales_logs_recordedById_idx" ON "sales_logs"("recordedById");

-- CreateIndex
CREATE INDEX "sales_logs_approvedById_idx" ON "sales_logs"("approvedById");

-- CreateIndex
CREATE INDEX "sales_payments_tenantId_idx" ON "sales_payments"("tenantId");

-- CreateIndex
CREATE INDEX "sales_payments_salesLogId_idx" ON "sales_payments"("salesLogId");

-- CreateIndex
CREATE INDEX "sales_payments_bankAccountId_idx" ON "sales_payments"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_payments_salesLogId_clientId_key" ON "sales_payments"("salesLogId", "clientId");

-- CreateIndex
CREATE INDEX "sales_payment_reviews_tenantId_idx" ON "sales_payment_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "sales_payment_reviews_paymentId_idx" ON "sales_payment_reviews"("paymentId");

-- CreateIndex
CREATE INDEX "sales_payment_reviews_reviewedById_idx" ON "sales_payment_reviews"("reviewedById");

-- CreateIndex
CREATE INDEX "daily_stock_reports_tenantId_idx" ON "daily_stock_reports"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stock_reports_stationId_reportDate_key" ON "daily_stock_reports"("stationId", "reportDate");

-- CreateIndex
CREATE INDEX "tank_dippings_tenantId_idx" ON "tank_dippings"("tenantId");

-- CreateIndex
CREATE INDEX "tank_dippings_dailyStockReportId_idx" ON "tank_dippings"("dailyStockReportId");

-- CreateIndex
CREATE INDEX "tank_dippings_tankId_idx" ON "tank_dippings"("tankId");

-- CreateIndex
CREATE INDEX "tickets_tenantId_idx" ON "tickets"("tenantId");

-- CreateIndex
CREATE INDEX "tickets_stationId_idx" ON "tickets"("stationId");

-- CreateIndex
CREATE INDEX "tickets_raisedById_idx" ON "tickets"("raisedById");

-- CreateIndex
CREATE INDEX "tickets_approvedById_idx" ON "tickets"("approvedById");

-- CreateIndex
CREATE INDEX "tickets_parentTicketId_idx" ON "tickets"("parentTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "variance_logs_ticketId_key" ON "variance_logs"("ticketId");

-- CreateIndex
CREATE INDEX "variance_logs_tenantId_idx" ON "variance_logs"("tenantId");

-- CreateIndex
CREATE INDEX "variance_logs_ticketId_idx" ON "variance_logs"("ticketId");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "waybills_tenantId_idx" ON "waybills"("tenantId");

-- CreateIndex
CREATE INDEX "waybills_recordedById_idx" ON "waybills"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "waybills_tenantId_number_key" ON "waybills"("tenantId", "number");

-- CreateIndex
CREATE INDEX "waybill_allocations_tenantId_idx" ON "waybill_allocations"("tenantId");

-- CreateIndex
CREATE INDEX "waybill_allocations_waybillId_idx" ON "waybill_allocations"("waybillId");

-- CreateIndex
CREATE INDEX "waybill_allocations_stationId_idx" ON "waybill_allocations"("stationId");

-- CreateIndex
CREATE INDEX "waybill_allocations_deliveryId_idx" ON "waybill_allocations"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "waybill_allocations_waybillId_stationId_key" ON "waybill_allocations"("waybillId", "stationId");

-- CreateIndex
CREATE INDEX "pumps_tenantId_idx" ON "pumps"("tenantId");

-- CreateIndex
CREATE INDEX "pumps_stationId_idx" ON "pumps"("stationId");

-- CreateIndex
CREATE INDEX "pumps_tankId_idx" ON "pumps"("tankId");

-- CreateIndex
CREATE INDEX "nozzles_tenantId_idx" ON "nozzles"("tenantId");

-- CreateIndex
CREATE INDEX "nozzles_pumpId_idx" ON "nozzles"("pumpId");

-- CreateIndex
CREATE INDEX "shift_logs_tenantId_idx" ON "shift_logs"("tenantId");

-- CreateIndex
CREATE INDEX "shift_logs_nozzleId_idx" ON "shift_logs"("nozzleId");

-- CreateIndex
CREATE INDEX "shift_logs_attendantId_idx" ON "shift_logs"("attendantId");

-- CreateIndex
CREATE INDEX "shift_logs_reconciledById_idx" ON "shift_logs"("reconciledById");

-- CreateIndex
CREATE INDEX "expenses_tenantId_idx" ON "expenses"("tenantId");

-- CreateIndex
CREATE INDEX "expenses_stationId_idx" ON "expenses"("stationId");

-- CreateIndex
CREATE INDEX "expenses_recordedById_idx" ON "expenses"("recordedById");

-- CreateIndex
CREATE INDEX "expenses_approvedById_idx" ON "expenses"("approvedById");

-- CreateIndex
CREATE INDEX "waybill_dippings_tenantId_idx" ON "waybill_dippings"("tenantId");

-- CreateIndex
CREATE INDEX "waybill_dippings_waybillId_idx" ON "waybill_dippings"("waybillId");

-- CreateIndex
CREATE INDEX "waybill_dippings_waybillAllocationId_idx" ON "waybill_dippings"("waybillAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "depots_tenantId_idx" ON "depots"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "depots_tenantId_name_key" ON "depots"("tenantId", "name");

-- CreateIndex
CREATE INDEX "fleet_transporters_tenantId_idx" ON "fleet_transporters"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_trucks_tenantId_idx" ON "fleet_trucks"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_trucks_transporterId_idx" ON "fleet_trucks"("transporterId");

-- CreateIndex
CREATE INDEX "fleet_truck_maintenance_history_truckId_idx" ON "fleet_truck_maintenance_history"("truckId");

-- CreateIndex
CREATE INDEX "fleet_drivers_tenantId_idx" ON "fleet_drivers"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_drivers_transporterId_idx" ON "fleet_drivers"("transporterId");

-- CreateIndex
CREATE INDEX "fleet_orders_tenantId_idx" ON "fleet_orders"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_transports_tenantId_idx" ON "fleet_transports"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_transports_orderId_idx" ON "fleet_transports"("orderId");

-- CreateIndex
CREATE INDEX "fleet_transports_transporterId_idx" ON "fleet_transports"("transporterId");

-- CreateIndex
CREATE INDEX "fleet_transports_truckId_idx" ON "fleet_transports"("truckId");

-- CreateIndex
CREATE INDEX "fleet_transports_driverId_idx" ON "fleet_transports"("driverId");

-- CreateIndex
CREATE INDEX "fleet_transport_loss_logs_tenantId_idx" ON "fleet_transport_loss_logs"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_transport_loss_logs_transportId_idx" ON "fleet_transport_loss_logs"("transportId");

-- CreateIndex
CREATE INDEX "fleet_sales_tenantId_idx" ON "fleet_sales"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_sales_organizationId_idx" ON "fleet_sales"("organizationId");

-- CreateIndex
CREATE INDEX "fleet_sales_customerId_idx" ON "fleet_sales"("customerId");

-- CreateIndex
CREATE INDEX "fleet_sales_stationId_idx" ON "fleet_sales"("stationId");

-- CreateIndex
CREATE INDEX "fleet_sales_transportId_idx" ON "fleet_sales"("transportId");

-- CreateIndex
CREATE INDEX "fleet_transactions_tenantId_idx" ON "fleet_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_transactions_deliveryId_idx" ON "fleet_transactions"("deliveryId");

-- CreateIndex
CREATE INDEX "fleet_transactions_transporterId_idx" ON "fleet_transactions"("transporterId");

-- CreateIndex
CREATE INDEX "fleet_transactions_transportId_idx" ON "fleet_transactions"("transportId");

-- CreateIndex
CREATE INDEX "fleet_transactions_truckId_idx" ON "fleet_transactions"("truckId");

-- CreateIndex
CREATE INDEX "fleet_transactions_orderId_idx" ON "fleet_transactions"("orderId");

-- CreateIndex
CREATE INDEX "fleet_transactions_feeLeg_idx" ON "fleet_transactions"("feeLeg");

-- CreateIndex
CREATE INDEX "dipping_sessions_tenantId_idx" ON "dipping_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "dipping_sessions_stationId_idx" ON "dipping_sessions"("stationId");

-- CreateIndex
CREATE INDEX "dipping_sessions_tankId_idx" ON "dipping_sessions"("tankId");

-- CreateIndex
CREATE UNIQUE INDEX "dipping_closings_generateddeliveryId_key" ON "dipping_closings"("generateddeliveryId");

-- CreateIndex
CREATE INDEX "dipping_closings_sessionId_idx" ON "dipping_closings"("sessionId");

-- CreateIndex
CREATE INDEX "bank_accounts_tenantId_idx" ON "bank_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "bank_accounts_organizationId_idx" ON "bank_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "station_bank_accounts_tenantId_stationId_idx" ON "station_bank_accounts"("tenantId", "stationId");

-- CreateIndex
CREATE INDEX "station_bank_accounts_bankAccountId_idx" ON "station_bank_accounts"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "station_bank_accounts_stationId_bankAccountId_key" ON "station_bank_accounts"("stationId", "bankAccountId");

-- CreateIndex
CREATE INDEX "transport_trip_legs_tenantId_idx" ON "transport_trip_legs"("tenantId");

-- CreateIndex
CREATE INDEX "transport_trip_legs_transportId_idx" ON "transport_trip_legs"("transportId");

-- CreateIndex
CREATE INDEX "transport_trip_legs_transportId_sequence_idx" ON "transport_trip_legs"("transportId", "sequence");

-- CreateIndex
CREATE INDEX "fleet_driver_assignments_tenantId_idx" ON "fleet_driver_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_driver_assignments_driverId_idx" ON "fleet_driver_assignments"("driverId");

-- CreateIndex
CREATE INDEX "fleet_driver_assignments_tripLegId_idx" ON "fleet_driver_assignments"("tripLegId");

-- CreateIndex
CREATE INDEX "fleet_transport_invitations_tenantId_idx" ON "fleet_transport_invitations"("tenantId");

-- CreateIndex
CREATE INDEX "fleet_transport_invitations_orderId_idx" ON "fleet_transport_invitations"("orderId");

-- CreateIndex
CREATE INDEX "fleet_transport_invitations_transporterId_idx" ON "fleet_transport_invitations"("transporterId");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_stationId_idx" ON "stock_movements"("tenantId", "stationId");

-- CreateIndex
CREATE INDEX "stock_movements_tankId_recordedAt_idx" ON "stock_movements"("tankId", "recordedAt");

-- CreateIndex
CREATE INDEX "notification_channel_settings_tenantId_idx" ON "notification_channel_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_settings_tenantId_module_channel_key" ON "notification_channel_settings"("tenantId", "module", "channel");

-- CreateIndex
CREATE INDEX "notification_messages_tenantId_module_createdAt_idx" ON "notification_messages"("tenantId", "module", "createdAt");

-- CreateIndex
CREATE INDEX "notification_messages_createdById_idx" ON "notification_messages"("createdById");

-- CreateIndex
CREATE INDEX "notification_deliveries_tenantId_userId_createdAt_idx" ON "notification_deliveries"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_messageId_idx" ON "notification_deliveries"("messageId");

-- CreateIndex
CREATE INDEX "notification_deliveries_userId_channel_readAt_idx" ON "notification_deliveries"("userId", "channel", "readAt");

-- CreateIndex
CREATE INDEX "_StationStaff_B_index" ON "_StationStaff"("B");

-- AddForeignKey
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingClientRegistration" ADD CONSTRAINT "PendingClientRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks" ADD CONSTRAINT "tanks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks" ADD CONSTRAINT "tanks_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_controls" ADD CONSTRAINT "price_controls_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_controls" ADD CONSTRAINT "price_controls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_controls" ADD CONSTRAINT "price_controls_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_parentdeliveryId_fkey" FOREIGN KEY ("parentdeliveryId") REFERENCES "sales_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_posBankAccountId_fkey" FOREIGN KEY ("posBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_logs" ADD CONSTRAINT "sales_logs_transferBankAccountId_fkey" FOREIGN KEY ("transferBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_salesLogId_fkey" FOREIGN KEY ("salesLogId") REFERENCES "sales_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payment_reviews" ADD CONSTRAINT "sales_payment_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payment_reviews" ADD CONSTRAINT "sales_payment_reviews_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "sales_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payment_reviews" ADD CONSTRAINT "sales_payment_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stock_reports" ADD CONSTRAINT "daily_stock_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stock_reports" ADD CONSTRAINT "daily_stock_reports_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tank_dippings" ADD CONSTRAINT "tank_dippings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tank_dippings" ADD CONSTRAINT "tank_dippings_dailyStockReportId_fkey" FOREIGN KEY ("dailyStockReportId") REFERENCES "daily_stock_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tank_dippings" ADD CONSTRAINT "tank_dippings_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "pumps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "nozzles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_parentTicketId_fkey" FOREIGN KEY ("parentTicketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_logs" ADD CONSTRAINT "variance_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_logs" ADD CONSTRAINT "variance_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_logs" ADD CONSTRAINT "variance_logs_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_logs" ADD CONSTRAINT "variance_logs_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "waybills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_allocations" ADD CONSTRAINT "waybill_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_allocations" ADD CONSTRAINT "waybill_allocations_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "waybills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_allocations" ADD CONSTRAINT "waybill_allocations_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_allocations" ADD CONSTRAINT "waybill_allocations_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "fleet_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nozzles" ADD CONSTRAINT "nozzles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nozzles" ADD CONSTRAINT "nozzles_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "pumps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "nozzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_dippings" ADD CONSTRAINT "waybill_dippings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_dippings" ADD CONSTRAINT "waybill_dippings_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "waybills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_dippings" ADD CONSTRAINT "waybill_dippings_waybillAllocationId_fkey" FOREIGN KEY ("waybillAllocationId") REFERENCES "waybill_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_dippings" ADD CONSTRAINT "waybill_dippings_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_dippings" ADD CONSTRAINT "waybill_dippings_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depots" ADD CONSTRAINT "depots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transporters" ADD CONSTRAINT "fleet_transporters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trucks" ADD CONSTRAINT "fleet_trucks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trucks" ADD CONSTRAINT "fleet_trucks_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "fleet_transporters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_truck_maintenance_history" ADD CONSTRAINT "fleet_truck_maintenance_history_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "fleet_transporters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_orders" ADD CONSTRAINT "fleet_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transports" ADD CONSTRAINT "fleet_transports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transports" ADD CONSTRAINT "fleet_transports_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "fleet_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transports" ADD CONSTRAINT "fleet_transports_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "fleet_transporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transports" ADD CONSTRAINT "fleet_transports_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transports" ADD CONSTRAINT "fleet_transports_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_loss_logs" ADD CONSTRAINT "fleet_transport_loss_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_loss_logs" ADD CONSTRAINT "fleet_transport_loss_logs_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "fleet_transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_sales" ADD CONSTRAINT "fleet_sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_sales" ADD CONSTRAINT "fleet_sales_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_sales" ADD CONSTRAINT "fleet_sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_sales" ADD CONSTRAINT "fleet_sales_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_sales" ADD CONSTRAINT "fleet_sales_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "fleet_transports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_salesLogId_fkey" FOREIGN KEY ("salesLogId") REFERENCES "sales_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "fleet_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "fleet_transporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "fleet_transports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transactions" ADD CONSTRAINT "fleet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "fleet_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dipping_sessions" ADD CONSTRAINT "dipping_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dipping_sessions" ADD CONSTRAINT "dipping_sessions_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dipping_sessions" ADD CONSTRAINT "dipping_sessions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dipping_closings" ADD CONSTRAINT "dipping_closings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dipping_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dipping_closings" ADD CONSTRAINT "dipping_closings_generateddeliveryId_fkey" FOREIGN KEY ("generateddeliveryId") REFERENCES "sales_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_bank_accounts" ADD CONSTRAINT "station_bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_bank_accounts" ADD CONSTRAINT "station_bank_accounts_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_bank_accounts" ADD CONSTRAINT "station_bank_accounts_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_bank_accounts" ADD CONSTRAINT "station_bank_accounts_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_legs" ADD CONSTRAINT "transport_trip_legs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_legs" ADD CONSTRAINT "transport_trip_legs_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "fleet_transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_driver_assignments" ADD CONSTRAINT "fleet_driver_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_driver_assignments" ADD CONSTRAINT "fleet_driver_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_driver_assignments" ADD CONSTRAINT "fleet_driver_assignments_tripLegId_fkey" FOREIGN KEY ("tripLegId") REFERENCES "transport_trip_legs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_invitations" ADD CONSTRAINT "fleet_transport_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_invitations" ADD CONSTRAINT "fleet_transport_invitations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "fleet_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_invitations" ADD CONSTRAINT "fleet_transport_invitations_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "fleet_transporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_invitations" ADD CONSTRAINT "fleet_transport_invitations_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_transport_invitations" ADD CONSTRAINT "fleet_transport_invitations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "fleet_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_channel_settings" ADD CONSTRAINT "notification_channel_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "notification_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StationStaff" ADD CONSTRAINT "_StationStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StationStaff" ADD CONSTRAINT "_StationStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
