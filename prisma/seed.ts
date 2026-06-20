import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import argon2 from "argon2";
import "dotenv/config";

import { ALL_PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS } from "../lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required.");
  }

  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  await ensurePlatformRole("Platform Super Admin", ALL_PLATFORM_PERMISSION_KEYS);

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.platformUser.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      passwordHash,
      isSuperAdmin: true,
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
    create: {
      email: adminEmail.toLowerCase(),
      firstName: "Super",
      lastName: "Admin",
      passwordHash,
      mustChangePassword: true,
      isSuperAdmin: true,
      permissions: ALL_PLATFORM_PERMISSION_KEYS,
    },
  });

  console.log(`Seed complete. Super admin: ${adminEmail.toLowerCase()}`);
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
