import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import {
  ALL_PERMISSIONS,
  ALL_PLATFORM_PERMISSION_KEYS,
} from "../lib/auth/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function ensurePlatformRole(name: string, permissions: string[]) {
  const existing = await prisma.roleTemplate.findFirst({
    where: { scope: "PLATFORM", tenantId: null, name },
  });
  if (existing) {
    return prisma.roleTemplate.update({
      where: { id: existing.id },
      data: { permissions, isSystem: true },
    });
  }
  return prisma.roleTemplate.create({
    data: { scope: "PLATFORM", name, permissions, isSystem: true },
  });
}

async function main() {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error(
      "❌ Missing required environment variables: PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD must be defined.",
    );
    process.exit(1);
  }

  console.log("🌱 Starting platform-only seed...");

  console.log("Seeding system permissions...");
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }
  console.log(`✅ System permissions synchronized (${ALL_PERMISSIONS.length} total).`);

  console.log("Ensuring Platform Super Admin role template...");
  await ensurePlatformRole(
    "Platform Super Admin",
    ALL_PLATFORM_PERMISSION_KEYS,
  );
  console.log("✅ Platform Super Admin role template configured.");

  console.log(`Seeding Platform Admin (${adminEmail})...`);
  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const adminData = {
    email: adminEmail,
    passwordHash,
    firstName: "Platform",
    lastName: "Super Admin",
    mustChangePassword: false,
    isSuperAdmin: true,
    status: "ACTIVE" as const,
    permissions: ALL_PLATFORM_PERMISSION_KEYS,
  };

  await prisma.platformUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isSuperAdmin: true,
      status: "ACTIVE",
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
      mustChangePassword: false,
    },
    create: adminData,
  });

  console.log(`✅ Platform Admin successfully seeded: ${adminEmail}`);
  console.log("✨ Platform seed completed.");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
