import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS, ALL_TENANT_PERMISSION_KEYS, TENANT_BUILTIN_ROLES } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  await ensurePlatformRole("Platform Super Admin", ALL_PLATFORM_PERMISSION_KEYS);

  console.log("Seeding Platform Admin...");
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const platformPasswordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    await prisma.platformUser.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: platformPasswordHash,
        isSuperAdmin: true,
        mustChangePassword: true,
        permissions: ALL_PLATFORM_PERMISSION_KEYS,
      },
      create: {
        email: adminEmail,
        passwordHash: platformPasswordHash,
        firstName: "Super",
        lastName: "Admin",
        mustChangePassword: true,
        isSuperAdmin: true,
        status: "ACTIVE",
        permissions: ALL_PLATFORM_PERMISSION_KEYS,
      },
    });
  } else {
    console.log("Skipping Platform Admin seed: PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_PASSWORD not set in env.");
  }


  // Tenant seeding removed for testing onboarding
}

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
